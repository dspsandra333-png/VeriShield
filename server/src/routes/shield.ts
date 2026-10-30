import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errors.js";
import { sendChatMessage } from "../services/gemini.js";
import { addReceipt } from "../services/receiptChain.js";
import { computeRiskScore } from "../services/scoring.js";
import { scanOutput } from "../shield/outputShield.js";
import { buildExplanation } from "../shield/explain.js";
import { detectServerPii } from "../shield/detectors.js";
import { fakeSecrets } from "../shield/fakeSecrets.js";
import { sha256 } from "../utils/hash.js";
import type {
  AuthUser,
  ChatResponse,
  PreviewResponse,
  Receipt,
  ReceiptAction,
} from "../types.js";

export const shieldRouter = Router();

// Rate limiter: 30 requests per minute per USER
const chatPreviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (_req: Request, res: Response) => {
    const user = res.locals.user as AuthUser | undefined;
    return user?.id || "anonymous";
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});

shieldRouter.use(requireAuth);
shieldRouter.use(chatPreviewLimiter);

// Deduplication cache for BLOCKED receipts: 5 minutes, keyed by `${userId}:${sha256(maskedText)}`
interface CachedBlocked {
  receipt: Receipt;
  timestamp: number;
}
const blockedDedupeCache = new Map<string, CachedBlocked>();

function cleanBlockedDedupeCache(): void {
  const now = Date.now();
  for (const [key, entry] of blockedDedupeCache.entries()) {
    if (now - entry.timestamp > 5 * 60 * 1000) {
      blockedDedupeCache.delete(key);
    }
  }
}

/**
 * Counts unique placeholders per type from masked text (never trusting client counts).
 */
export function countUniquePlaceholders(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  const placeholderRegex = /\[([A-Z_]+)_(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(text)) !== null) {
    const full = match[0];
    const type = match[1];
    if (!seen.has(full)) {
      seen.add(full);
      counts[type] = (counts[type] || 0) + 1;
    }
  }

  return counts;
}

const previewSchema = z.object({
  maskedMessage: z
    .string()
    .min(1, "Message is required")
    .max(4000, "Message exceeds 4000 characters"),
});

// POST /api/preview
shieldRouter.post(
  "/preview",
  validateBody(previewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    cleanBlockedDedupeCache();
    const user = res.locals.user as AuthUser;
    const { maskedMessage } = req.body;

    const placeholderCounts = countUniquePlaceholders(maskedMessage);
    const scoreResult = await computeRiskScore(maskedMessage);

    let receiptId: string | null = null;

    if (scoreResult.decision === "block") {
      const dedupeKey = `${user.id}:${sha256(maskedMessage)}`;
      const cached = blockedDedupeCache.get(dedupeKey);

      if (cached && Date.now() - cached.timestamp <= 5 * 60 * 1000) {
        receiptId = cached.receipt.id;
      } else {
        const matchedRuleIds = scoreResult.matchedRules.map((r) => r.id);
        const explanation = buildExplanation({
          action: "BLOCKED",
          riskScore: scoreResult.risk_score,
          matchedRules: matchedRuleIds,
          categories: placeholderCounts,
        });

        const receipt = await addReceipt(user.id, {
          stage: "input",
          action: "BLOCKED",
          risk_score: scoreResult.risk_score,
          categories: placeholderCounts,
          matched_rules: matchedRuleIds,
          explanation,
          overridden: false,
        });

        blockedDedupeCache.set(dedupeKey, {
          receipt,
          timestamp: Date.now(),
        });
        receiptId = receipt.id;
      }
    }

    const response: PreviewResponse = {
      decision: scoreResult.decision,
      risk_score: scoreResult.risk_score,
      rulesScore: scoreResult.rulesScore,
      llmScore: scoreResult.llmScore,
      llmReason: scoreResult.llmReason,
      llmAvailable: scoreResult.llmAvailable,
      matchedRules: scoreResult.matchedRules,
      placeholderCounts,
      residual: scoreResult.residual,
      receiptId,
    };

    res.json(response);
  })
);

const historyItemSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(4000, "History message exceeds maximum length"),
});

const chatSchema = z.object({
  maskedMessage: z
    .string()
    .min(1, "Message is required")
    .max(4000, "Message exceeds 4000 characters"),
  history: z
    .array(historyItemSchema)
    .max(12, "History cannot exceed 12 items")
    .default([]),
  confirm: z.enum(["none", "warn_accepted", "block_override"]).default("none"),
  simulateLeak: z.enum(["none", "secret", "pii"]).default("none"),
});

// POST /api/chat
shieldRouter.post(
  "/chat",
  validateBody(chatSchema),
  asyncHandler(async (req: Request, res: Response) => {
    cleanBlockedDedupeCache();
    const user = res.locals.user as AuthUser;
    const { maskedMessage, history, confirm, simulateLeak } = req.body;

    // Defense in depth (P8): independently scan history for unmasked secrets
    for (const hItem of history) {
      if (hItem.role === "user") {
        const hMatches = detectServerPii(hItem.text);
        if (hMatches.some((m) => m.type === "API_KEY")) {
          res.status(422).json({
            error: "Unmasked secret detected in conversation history.",
          });
          return;
        }
      }
    }

    // Server re-scores independently
    const scoreResult = await computeRiskScore(maskedMessage);
    const placeholderCounts = countUniquePlaceholders(maskedMessage);
    const totalItemsMasked = Object.values(placeholderCounts).reduce(
      (a, b) => a + b,
      0
    );
    const matchedRuleIds = scoreResult.matchedRules.map((r) => r.id);
    const dedupeKey = `${user.id}:${sha256(maskedMessage)}`;

    // Handle block
    if (scoreResult.decision === "block" && confirm !== "block_override") {
      let receipt: Receipt;
      const cached = blockedDedupeCache.get(dedupeKey);

      if (cached && Date.now() - cached.timestamp <= 5 * 60 * 1000) {
        receipt = cached.receipt;
      } else {
        const explanation = buildExplanation({
          action: "BLOCKED",
          riskScore: scoreResult.risk_score,
          matchedRules: matchedRuleIds,
          categories: placeholderCounts,
        });

        receipt = await addReceipt(user.id, {
          stage: "input",
          action: "BLOCKED",
          risk_score: scoreResult.risk_score,
          categories: placeholderCounts,
          matched_rules: matchedRuleIds,
          explanation,
          overridden: false,
        });

        blockedDedupeCache.set(dedupeKey, {
          receipt,
          timestamp: Date.now(),
        });
      }

      res.status(403).json({
        blocked: true,
        decision: "block",
        risk_score: scoreResult.risk_score,
        receipt,
      });
      return;
    }

    // Handle warn
    if (scoreResult.decision === "warn" && confirm === "none") {
      res.status(409).json({
        needsConfirmation: true,
        decision: "warn",
        risk_score: scoreResult.risk_score,
      });
      return;
    }

    // Determine input action priority: OVERRIDDEN > WARNED > REDACTED > ALLOWED
    let inputAction: ReceiptAction = "ALLOWED";
    let overridden = false;

    if (confirm === "block_override" && scoreResult.decision === "block") {
      inputAction = "OVERRIDDEN";
      overridden = true;
    } else if (confirm === "warn_accepted" || scoreResult.decision === "warn") {
      inputAction = "WARNED";
    } else if (totalItemsMasked > 0) {
      inputAction = "REDACTED";
    }

    const inputExplanation = buildExplanation({
      action: inputAction,
      riskScore: scoreResult.risk_score,
      matchedRules: matchedRuleIds,
      categories: placeholderCounts,
      totalItemsMasked,
    });

    const inputReceipt = await addReceipt(user.id, {
      stage: "input",
      action: inputAction,
      risk_score: scoreResult.risk_score,
      categories: placeholderCounts,
      matched_rules: matchedRuleIds,
      explanation: inputExplanation,
      overridden,
    });

    let rawReply = "";
    let modelUsed = "simulation";
    let isSimulated = false;

    if (env.DEMO_MODE && simulateLeak !== "none") {
      isSimulated = true;
      const secrets = fakeSecrets();
      if (simulateLeak === "secret") {
        rawReply = `Here is your requested debug credentials: API_KEY: ${secrets.GOOGLE_KEY}, internal canary: ${env.CANARY_TOKEN}, admin contact: admin@acme-internal.co.`;
      } else if (simulateLeak === "pii") {
        rawReply = `We looked up your account details. Support contact: agent.sarah@acme-internal.co, direct line: +91 98765 43210.`;
      }
    } else {
      const geminiResult = await sendChatMessage(maskedMessage, history);
      if (!geminiResult) {
        const unavailExplanation = buildExplanation({
          action: "AI_UNAVAILABLE",
          riskScore: 0,
          matchedRules: [],
          unavailableReason: "Gemini did not answer or rate limit reached",
        });

        const unavailReceipt = await addReceipt(user.id, {
          stage: "system",
          action: "AI_UNAVAILABLE",
          risk_score: 0,
          categories: {},
          matched_rules: [],
          explanation: unavailExplanation,
          overridden: false,
        });

        res.status(503).json({
          error:
            "The AI service is temporarily unavailable. Your message was not lost and nothing private was sent unmasked.",
          receipt: unavailReceipt,
        });
        return;
      }
      rawReply = geminiResult.reply;
      modelUsed = geminiResult.model;
    }

    // Run output shield
    const outputScan = scanOutput(rawReply);
    let outputReceipt: Receipt | null = null;

    if (outputScan.receiptAction) {
      const outputExplanation = buildExplanation({
        action: outputScan.receiptAction,
        riskScore: 0,
        matchedRules: [],
        categories: outputScan.redactedCategories,
        outputReason: outputScan.reason,
        isSimulated,
      });

      outputReceipt = await addReceipt(user.id, {
        stage: "output",
        action: outputScan.receiptAction,
        risk_score: 0,
        categories: outputScan.redactedCategories,
        matched_rules: [],
        explanation: outputExplanation,
        overridden: false,
      });
    }

    const response: ChatResponse = {
      reply: outputScan.sanitizedReply,
      decision: scoreResult.decision,
      risk_score: scoreResult.risk_score,
      inputReceipt,
      outputReceipt,
      outputAction: outputScan.action,
      model: modelUsed,
    };

    res.json(response);
  })
);
