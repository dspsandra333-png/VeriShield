import type { ReceiptAction } from "../types.js";
import { RULE_LABELS } from "./injectionRules.js";

export function formatFriendlyRules(rules: string[]): string {
  if (rules.length === 0) return "none";
  return rules.map((r) => RULE_LABELS[r] || r).join(", ");
}

export function formatCategorySummary(categories: Record<string, number>): string {
  const parts: string[] = [];
  for (const [cat, count] of Object.entries(categories)) {
    if (count > 0) {
      const label = cat.toLowerCase().replace(/_/g, " ");
      parts.push(`${count} ${label}${count > 1 ? "s" : ""}`);
    }
  }
  return parts.join(", ");
}

export function buildExplanation(params: {
  action: ReceiptAction;
  riskScore: number;
  matchedRules: string[];
  categories?: Record<string, number>;
  totalItemsMasked?: number;
  outputReason?: "canary" | "system_prompt" | "secret" | "pii";
  unavailableReason?: string;
  isSimulated?: boolean;
}): string {
  const {
    action,
    riskScore,
    matchedRules,
    categories = {},
    totalItemsMasked = 0,
    outputReason,
    unavailableReason = "Gemini service temporarily unreachable",
    isSimulated = false,
  } = params;

  let text = "";
  const ruleNames = formatFriendlyRules(matchedRules);

  switch (action) {
    case "ALLOWED":
      text = `Allowed: your message looked safe. Risk ${riskScore}/100. Nothing needed hiding.`;
      break;

    case "REDACTED": {
      const summary = formatCategorySummary(categories);
      const itemsText = summary ? ` (${summary})` : "";
      text = `Protected: ${totalItemsMasked} private item${
        totalItemsMasked === 1 ? "" : "s"
      } hidden on your device before sending${itemsText}. The AI only saw placeholders. Risk ${riskScore}/100.`;
      break;
    }

    case "WARNED":
      text = `Warning accepted: this message looked slightly suspicious (risk ${riskScore}/100, matched: ${ruleNames}). You chose to send it.`;
      break;

    case "BLOCKED":
      text = `Blocked: the prompt tried to override the assistant's instructions. Risk ${riskScore}/100. Matched: ${ruleNames}.`;
      break;

    case "OVERRIDDEN":
      text = `Override: you chose to send a message VeriShield had blocked (risk ${riskScore}/100). This override is recorded here.`;
      break;

    case "OUTPUT_BLOCKED":
      if (outputReason === "canary" || outputReason === "system_prompt") {
        text =
          "Reply withheld: the AI's answer appeared to reveal its hidden instructions. Nothing was shown to you.";
      } else {
        text =
          "Reply withheld: the AI's answer contained something that looked like an API key. Nothing was shown to you.";
      }
      break;

    case "OUTPUT_REDACTED": {
      const summary = formatCategorySummary(categories) || "private data";
      text = `Reply cleaned: ${summary} in the AI's answer was replaced with [REDACTED_*].`;
      break;
    }

    case "AI_UNAVAILABLE":
      text = `The AI service did not answer (${unavailableReason}). Your message was not lost and nothing private was sent unmasked.`;
      break;

    default:
      text = `Decision ${action} recorded with risk ${riskScore}/100.`;
  }

  if (isSimulated) {
    text += " (demo simulation)";
  }

  return text;
}

