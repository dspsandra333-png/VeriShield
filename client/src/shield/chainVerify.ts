import type { VerifyResponse } from "../types.js";

export const GENESIS_PREV_HASH = "0".repeat(64);

/**
 * Client-side Canonical JSON serialization identical to server implementation.
 * Recursively sorts keys alphabetically while maintaining array ordering.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * Computes SHA-256 digest using the browser WebCrypto API.
 */
export async function sha256Browser(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface MinimalReceiptForVerification {
  user_id: string;
  seq: number;
  ts: string;
  stage: string;
  action: string;
  risk_score: number;
  categories: Record<string, number>;
  matched_rules: string[];
  explanation: string;
  overridden: boolean;
  prev_hash: string;
  entry_hash: string;
}

/**
 * Independently verifies a hash-chained receipt log inside the browser using WebCrypto.
 */
export async function verifyReceiptChainInBrowser(
  receipts: MinimalReceiptForVerification[],
  anchor?: { seq: number; hash: string } | null
): Promise<VerifyResponse> {
  if (receipts.length === 0) {
    const anchorOk = anchor ? false : null;
    return {
      valid: anchor ? false : true,
      checked: 0,
      broken_at_seq: null,
      reason: anchor ? "Chain is empty but anchor was provided" : null,
      head_hash: null,
      head_seq: 0,
      anchorOk,
    };
  }

  let expectedPrev = GENESIS_PREV_HASH;

  for (let i = 0; i < receipts.length; i++) {
    const entry = receipts[i];
    const expectedSeq = i + 1;

    // 1. Contiguous sequence check
    if (entry.seq !== expectedSeq) {
      return {
        valid: false,
        checked: i,
        broken_at_seq: entry.seq,
        reason: `Sequence broken: expected seq ${expectedSeq}, found ${entry.seq}`,
        head_hash: i > 0 ? receipts[i - 1].entry_hash : null,
        head_seq: i > 0 ? receipts[i - 1].seq : 0,
        anchorOk: null,
      };
    }

    // 2. Previous hash link check
    if (entry.prev_hash !== expectedPrev) {
      return {
        valid: false,
        checked: i,
        broken_at_seq: entry.seq,
        reason: `Previous hash mismatch at seq ${entry.seq}`,
        head_hash: i > 0 ? receipts[i - 1].entry_hash : null,
        head_seq: i > 0 ? receipts[i - 1].seq : 0,
        anchorOk: null,
      };
    }

    // 3. Entry hash integrity check
    const canonicalPayload = canonicalJson({
      user_id: entry.user_id,
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

    const recomputedHash = await sha256Browser(entry.prev_hash + "|" + canonicalPayload);

    if (entry.entry_hash !== recomputedHash) {
      return {
        valid: false,
        checked: i,
        broken_at_seq: entry.seq,
        reason: `Entry hash mismatch at seq ${entry.seq}`,
        head_hash: i > 0 ? receipts[i - 1].entry_hash : null,
        head_seq: i > 0 ? receipts[i - 1].seq : 0,
        anchorOk: null,
      };
    }

    expectedPrev = entry.entry_hash;
  }

  const headEntry = receipts[receipts.length - 1];
  let anchorOk: boolean | null = null;
  let valid = true;
  let reason: string | null = null;

  if (anchor) {
    const matchingEntry = receipts.find((r) => r.seq === anchor.seq);
    if (!matchingEntry || matchingEntry.entry_hash !== anchor.hash) {
      anchorOk = false;
      valid = false;
      reason = "Anchor mismatch: anchored entry missing or modified";
    } else {
      anchorOk = true;
    }
  }

  return {
    valid,
    checked: receipts.length,
    broken_at_seq: null,
    reason,
    head_hash: headEntry.entry_hash,
    head_seq: headEntry.seq,
    anchorOk,
  };
}
