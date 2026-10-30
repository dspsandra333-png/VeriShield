import { admin } from "../supabase.js";
import { env } from "../config.js";
import type { ReceiptAction, StatsResponse } from "../types.js";

const DEFAULT_BY_ACTION: Record<ReceiptAction, number> = {
  ALLOWED: 0,
  REDACTED: 0,
  WARNED: 0,
  BLOCKED: 0,
  OVERRIDDEN: 0,
  OUTPUT_BLOCKED: 0,
  OUTPUT_REDACTED: 0,
  AI_UNAVAILABLE: 0,
};

export async function getUserStats(userId: string): Promise<StatsResponse> {
  const byAction = { ...DEFAULT_BY_ACTION };
  let total = 0;
  let itemsMasked = 0;
  let sumRisk = 0;

  const pageSize = 500;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await admin
      .from("receipts")
      .select("action, stage, risk_score, categories")
      .eq("user_id", userId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to calculate stats: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const r of data) {
      total++;
      const action = r.action as ReceiptAction;
      if (byAction[action] !== undefined) {
        byAction[action]++;
      }
      sumRisk += r.risk_score || 0;

      if (r.stage === "input" && r.categories && typeof r.categories === "object") {
        for (const count of Object.values(r.categories)) {
          if (typeof count === "number") {
            itemsMasked += count;
          }
        }
      }
    }

    if (data.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  const avgRisk = total > 0 ? Math.round(sumRisk / total) : 0;

  return {
    total,
    byAction,
    itemsMasked,
    avgRisk,
    demoMode: env.DEMO_MODE,
  };
}

