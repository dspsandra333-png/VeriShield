import { addReceipt } from "./receiptChain.js";

/**
 * Creates 3 realistic sample receipts through the real hash-chain engine for a given user.
 * Shared between scripts/seed.ts and POST /api/demo/reset.
 */
export async function createSampleReceipts(userId: string): Promise<void> {
  // 1. Allowed normal message
  await addReceipt(userId, {
    stage: "input",
    action: "ALLOWED",
    risk_score: 12,
    categories: {},
    matched_rules: [],
    explanation: "Allowed: your message looked safe. Risk 12/100. Nothing needed hiding.",
    overridden: false,
  });

  // 2. Protected/redacted message with masked PII
  await addReceipt(userId, {
    stage: "input",
    action: "REDACTED",
    risk_score: 8,
    categories: {
      EMAIL: 1,
      PHONE: 1,
      API_KEY: 1,
    },
    matched_rules: [],
    explanation:
      "Protected: 3 private items were hidden on your device before sending (1 email, 1 phone number, 1 API key). The AI only saw placeholders. Risk 8/100.",
    overridden: false,
  });

  // 3. Blocked prompt injection attack
  await addReceipt(userId, {
    stage: "input",
    action: "BLOCKED",
    risk_score: 87,
    categories: {},
    matched_rules: ["instruction-override"],
    explanation:
      "Blocked: the prompt tried to override the assistant's instructions. Risk 87/100. Matched: instruction-override pattern.",
    overridden: false,
  });
}

