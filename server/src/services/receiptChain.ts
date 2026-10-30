import { sha256 } from "../utils/hash.js";
import { canonicalJson } from "../utils/canonicalJson.js";
import { admin } from "../supabase.js";
import type {
  Receipt,
  ReceiptAction,
  ReceiptStage,
  VerifyResponse,
} from "../types.js";

export const GENESIS_PREV_HASH = "0".repeat(64);

export interface ReceiptDataInput {
  stage: ReceiptStage;
  action: ReceiptAction;
  risk_score: number;
  categories: Record<string, number>;
  matched_rules: string[];
  explanation: string;
  overridden?: boolean;
}

export interface PureReceiptRecord {
  user_id: string;
  seq: number;
  ts: string;
  stage: ReceiptStage;
  action: ReceiptAction;
  risk_score: number;
  categories: Record<string, number>;
  matched_rules: string[];
  explanation: string;
  overridden: boolean;
  prev_hash: string;
  entry_hash: string;
}

/**
 * Computes SHA-256 entry_hash for a receipt record given its prev_hash and canonical payload.
 */
export function computeEntryHash(
  prevHash: string,
  payload: {
    user_id: string;
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
): string {
  const canonicalPayload = canonicalJson({
    user_id: payload.user_id,
    seq: payload.seq,
    ts: payload.ts,
    stage: payload.stage,
    action: payload.action,
    risk_score: payload.risk_score,
    categories: payload.categories,
    matched_rules: payload.matched_rules,
    explanation: payload.explanation,
    overridden: payload.overridden,
  });
  return sha256(prevHash + "|" + canonicalPayload);
}

/**
 * Pure function to verify a sequence of receipts in memory.
 * Can be unit-tested without database access.
 */
export function verifyReceiptChainPure(
  receipts: PureReceiptRecord[],
  anchor?: { seq: number; hash: string } | null
): VerifyResponse {
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
    const recomputedHash = computeEntryHash(entry.prev_hash, {
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

// In-process promise queue per user to prevent concurrent race conditions on sequence insertion
const userQueues = new Map<string, Promise<unknown>>();

function enqueueForUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const currentQueue = userQueues.get(userId) || Promise.resolve();
  const nextPromise = currentQueue.then(fn, fn);
  userQueues.set(userId, nextPromise);
  return nextPromise;
}

/**
 * Adds a new receipt to the user's hash chain with automatic sequencing,
 * hash linking, and unique constraint retry logic.
 */
export async function addReceipt(
  userId: string,
  input: ReceiptDataInput
): Promise<Receipt> {
  return enqueueForUser(userId, async () => {
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      attempts++;

      // Read user's latest receipt
      const { data: latestRows, error: fetchErr } = await admin
        .from("receipts")
        .select("seq, entry_hash")
        .eq("user_id", userId)
        .order("seq", { ascending: false })
        .limit(1);

      if (fetchErr) {
        throw new Error(`Failed to fetch latest receipt: ${fetchErr.message}`);
      }

      const latest = latestRows && latestRows.length > 0 ? latestRows[0] : null;
      const nextSeq = latest ? latest.seq + 1 : 1;
      const prevHash = latest ? latest.entry_hash : GENESIS_PREV_HASH;
      const ts = new Date().toISOString();
      const overridden = input.overridden ?? false;

      const entryHash = computeEntryHash(prevHash, {
        user_id: userId,
        seq: nextSeq,
        ts,
        stage: input.stage,
        action: input.action,
        risk_score: input.risk_score,
        categories: input.categories,
        matched_rules: input.matched_rules,
        explanation: input.explanation,
        overridden,
      });

      const insertPayload = {
        user_id: userId,
        seq: nextSeq,
        ts,
        stage: input.stage,
        action: input.action,
        risk_score: input.risk_score,
        categories: input.categories,
        matched_rules: input.matched_rules,
        explanation: input.explanation,
        overridden,
        prev_hash: prevHash,
        entry_hash: entryHash,
        demo_backup: null,
      };

      const { data: inserted, error: insertErr } = await admin
        .from("receipts")
        .insert(insertPayload)
        .select()
        .single();

      if (!insertErr && inserted) {
        return {
          id: inserted.id,
          user_id: inserted.user_id,
          seq: inserted.seq,
          ts: inserted.ts,
          stage: inserted.stage,
          action: inserted.action,
          risk_score: inserted.risk_score,
          categories: inserted.categories as Record<string, number>,
          matched_rules: inserted.matched_rules as string[],
          explanation: inserted.explanation,
          overridden: inserted.overridden,
          prev_hash: inserted.prev_hash,
          entry_hash: inserted.entry_hash,
          demo_tampered: inserted.demo_backup !== null,
          created_at: inserted.created_at,
        };
      }

      // If unique violation (23505), retry
      if (insertErr && insertErr.code === "23505" && attempts < maxAttempts) {
        continue;
      }

      throw new Error(`Failed to insert receipt: ${insertErr?.message || "unknown error"}`);
    }

    throw new Error("Failed to insert receipt after retrying sequence collisions.");
  });
}

/**
 * Verifies the full chain of receipts for a given user from the database.
 * Reads in pages of 500 rows.
 */
export async function verifyChain(
  userId: string,
  anchor?: { seq: number; hash: string } | null
): Promise<VerifyResponse> {
  const allReceipts: PureReceiptRecord[] = [];
  const pageSize = 500;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await admin
      .from("receipts")
      .select(
        "user_id, seq, ts, stage, action, risk_score, categories, matched_rules, explanation, overridden, prev_hash, entry_hash"
      )
      .eq("user_id", userId)
      .order("seq", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Database error verifying chain: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const r of data) {
      allReceipts.push({
        user_id: r.user_id,
        seq: r.seq,
        ts: r.ts,
        stage: r.stage,
        action: r.action,
        risk_score: r.risk_score,
        categories: (r.categories || {}) as Record<string, number>,
        matched_rules: (r.matched_rules || []) as string[],
        explanation: r.explanation,
        overridden: Boolean(r.overridden),
        prev_hash: r.prev_hash,
        entry_hash: r.entry_hash,
      });
    }

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return verifyReceiptChainPure(allReceipts, anchor);
}

