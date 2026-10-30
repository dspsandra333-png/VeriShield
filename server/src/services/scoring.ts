import type { Decision, RuleInfo } from "../types.js";
import { evaluateRules, RULE_LABELS } from "../shield/injectionRules.js";
import { detectServerPii } from "../shield/detectors.js";
import { classifyPrompt } from "./gemini.js";

export const DECISION_THRESHOLDS = {
  ALLOW_MAX: 29,
  WARN_MIN: 30,
  WARN_MAX: 70,
  BLOCK_MIN: 71,
} as const;

export function getDecision(score: number): Decision {
  if (score < DECISION_THRESHOLDS.WARN_MIN) {
    return "allow";
  }
  if (score <= DECISION_THRESHOLDS.WARN_MAX) {
    return "warn";
  }
  return "block";
}

export interface ScoreResult {
  decision: Decision;
  risk_score: number;
  rulesScore: number;
  llmScore: number | null;
  llmReason: string | null;
  llmAvailable: boolean;
  matchedRules: RuleInfo[];
  residual: { secrets: number; personal: number };
}

/**
 * Computes the final composite score based on:
 * 1. Weighted injection rules
 * 2. Server-side residual detection (unmasked secrets or PII)
 * 3. Gemini prompt-injection classifier (on sanitized masked text)
 */
export async function computeRiskScore(
  maskedText: string,
  skipLlm = false
): Promise<ScoreResult> {
  const { rulesScore: initialRulesScore, matchedRules: ruleIds } = evaluateRules(maskedText);

  // Server residual scan for defense-in-depth
  const residualMatches = detectServerPii(maskedText);
  let secretsCount = 0;
  let personalCount = 0;

  for (const m of residualMatches) {
    if (m.type === "API_KEY") {
      secretsCount++;
    } else {
      personalCount++;
    }
  }

  const allRuleWeights: number[] = [];
  // Add base matched rule weights
  for (const rid of ruleIds) {
    if (rid === "instruction-override") allRuleWeights.push(85);
    else if (rid === "system-prompt-extraction") allRuleWeights.push(80);
    else if (rid === "multilingual-override") allRuleWeights.push(80);
    else if (rid === "jailbreak-persona") allRuleWeights.push(70);
    else if (rid === "disable-safety") allRuleWeights.push(70);
    else if (rid === "fake-system-delimiter") allRuleWeights.push(65);
    else if (rid === "encoded-payload") allRuleWeights.push(60);
    else if (rid === "data-exfiltration") allRuleWeights.push(60);
    else if (rid === "secret-fishing") allRuleWeights.push(55);
    else if (rid === "authority-claim") allRuleWeights.push(50);
    else if (rid === "roleplay-override") allRuleWeights.push(45);
  }

  if (secretsCount > 0 && !ruleIds.includes("secret-in-message")) {
    ruleIds.push("secret-in-message");
    allRuleWeights.push(75);
  }
  if (personalCount > 0 && !ruleIds.includes("personal-data-missed")) {
    ruleIds.push("personal-data-missed");
    allRuleWeights.push(35);
  }

  let rulesScore = initialRulesScore;
  if (allRuleWeights.length > 0) {
    const highestWeight = Math.max(...allRuleWeights);
    const additional = allRuleWeights.length - 1;
    rulesScore = Math.min(100, highestWeight + additional * 10);
  }

  let llmScore: number | null = null;
  let llmReason: string | null = null;
  let llmAvailable = false;

  if (!skipLlm) {
    const classifierRes = await classifyPrompt(maskedText);
    if (classifierRes) {
      llmScore = classifierRes.score;
      llmReason = classifierRes.reason;
      llmAvailable = true;
    }
  }

  let finalScore = rulesScore;

  if (llmScore !== null) {
    finalScore = Math.max(rulesScore, Math.round((rulesScore + llmScore) / 2));
    if (llmScore >= 85 && rulesScore >= 30) {
      finalScore = Math.max(finalScore, 75);
    }
    if (llmScore >= 30 && !ruleIds.includes("ai-classifier")) {
      ruleIds.push("ai-classifier");
    }
  }

  finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));
  const decision = getDecision(finalScore);

  const matchedRuleObjects: RuleInfo[] = ruleIds.map((id) => ({
    id,
    label: RULE_LABELS[id] || id,
  }));

  return {
    decision,
    risk_score: finalScore,
    rulesScore,
    llmScore,
    llmReason,
    llmAvailable,
    matchedRules: matchedRuleObjects,
    residual: {
      secrets: secretsCount,
      personal: personalCount,
    },
  };
}

