import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeEntryHash,
  GENESIS_PREV_HASH,
  PureReceiptRecord,
} from "../src/services/receiptChain.js";
import { ReceiptAction, ReceiptStage } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ChainVectorRawEntry {
  seq: number;
  ts: string;
  stage: ReceiptStage;
  action: ReceiptAction;
  risk_score: number;
  categories: Record<string, number>;
  matched_rules: string[];
  explanation: string;
  overridden: boolean;
}

export function generateGoldenChainVector(): PureReceiptRecord[] {
  const fixedUserId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  const rawEntries: ChainVectorRawEntry[] = [
    {
      seq: 1,
      ts: "2026-01-01T10:00:00.000Z",
      stage: "input" as const,
      action: "ALLOWED" as const,
      risk_score: 10,
      categories: {},
      matched_rules: [],
      explanation: "Allowed: your message looked safe. Risk 10/100. Nothing needed hiding.",
      overridden: false,
    },
    {
      seq: 2,
      ts: "2026-01-01T10:01:00.000Z",
      stage: "input" as const,
      action: "REDACTED" as const,
      risk_score: 15,
      categories: { EMAIL: 1, PHONE: 1 },
      matched_rules: [],
      explanation: "Protected: 2 private items hidden on your device before sending. Risk 15/100.",
      overridden: false,
    },
    {
      seq: 3,
      ts: "2026-01-01T10:02:00.000Z",
      stage: "input" as const,
      action: "WARNED" as const,
      risk_score: 45,
      categories: {},
      matched_rules: ["roleplay-override"],
      explanation: "Warning accepted: this message looked slightly suspicious. Risk 45/100.",
      overridden: false,
    },
    {
      seq: 4,
      ts: "2026-01-01T10:03:00.000Z",
      stage: "input" as const,
      action: "BLOCKED" as const,
      risk_score: 85,
      categories: {},
      matched_rules: ["instruction-override"],
      explanation: "Blocked: prompt tried to override instructions. Risk 85/100.",
      overridden: false,
    },
    {
      seq: 5,
      ts: "2026-01-01T10:04:00.000Z",
      stage: "output" as const,
      action: "OUTPUT_REDACTED" as const,
      risk_score: 0,
      categories: { PHONE: 1 },
      matched_rules: [],
      explanation: "Reply cleaned: 1 phone number in the AI's answer was replaced.",
      overridden: false,
    },
    {
      seq: 6,
      ts: "2026-01-01T10:05:00.000Z",
      stage: "system" as const,
      action: "AI_UNAVAILABLE" as const,
      risk_score: 0,
      categories: {},
      matched_rules: [],
      explanation: "The AI service did not answer. Your message was not lost.",
      overridden: false,
    },
  ];

  let prevHash = GENESIS_PREV_HASH;
  const goldenChain: PureReceiptRecord[] = [];

  for (const entry of rawEntries) {
    const entryHash = computeEntryHash(prevHash, {
      user_id: fixedUserId,
      seq: entry.seq,
      ts: entry.ts,
      stage: entry.stage,
      action: entry.action,
      risk_score: entry.risk_score,
      categories: entry.categories,
      matched_rules: entry.matched_rules,
      explanation: entry.explanation,
      overridden: entry.overridden,
    });

    goldenChain.push({
      user_id: fixedUserId,
      seq: entry.seq,
      ts: entry.ts,
      stage: entry.stage,
      action: entry.action,
      risk_score: entry.risk_score,
      categories: entry.categories,
      matched_rules: entry.matched_rules,
      explanation: entry.explanation,
      overridden: entry.overridden,
      prev_hash: prevHash,
      entry_hash: entryHash,
    });

    prevHash = entryHash;
  }

  return goldenChain;
}

if (process.argv[1]?.endsWith("make-chain-vector.ts") || process.argv[1]?.endsWith("make-chain-vector.js")) {
  const chain = generateGoldenChainVector();
  const outputPath = path.resolve(__dirname, "../data/chain-vector.json");
  fs.writeFileSync(outputPath, JSON.stringify(chain, null, 2), "utf-8");
  console.log(`Golden chain vector written to ${outputPath} (6 entries)`);
}

