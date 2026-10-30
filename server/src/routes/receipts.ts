import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errors.js";
import { admin } from "../supabase.js";
import { verifyChain } from "../services/receiptChain.js";
import type { AuthUser, Receipt } from "../types.js";

export const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

const receiptsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.string().optional(),
  order: z.enum(["desc", "asc"]).default("desc"),
});

// GET /api/receipts
receiptsRouter.get(
  "/receipts",
  validateQuery(receiptsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const { limit, offset, action, order } = req.query as unknown as {
      limit: number;
      offset: number;
      action?: string;
      order: "desc" | "asc";
    };

    let query = admin
      .from("receipts")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (action && action.trim().length > 0) {
      query = query.eq("action", action.trim());
    }

    query = query
      .order("seq", { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      res.status(500).json({ error: "Failed to fetch audit receipts." });
      return;
    }

    const receipts: Receipt[] = (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      seq: row.seq,
      ts: row.ts,
      stage: row.stage,
      action: row.action,
      risk_score: row.risk_score,
      categories: (row.categories || {}) as Record<string, number>,
      matched_rules: (row.matched_rules || []) as string[],
      explanation: row.explanation,
      overridden: Boolean(row.overridden),
      prev_hash: row.prev_hash,
      entry_hash: row.entry_hash,
      demo_tampered: row.demo_backup !== null,
      created_at: row.created_at,
    }));

    res.json({
      receipts,
      total: count || 0,
    });
  })
);

const verifyQuerySchema = z.object({
  anchorSeq: z.coerce.number().optional(),
  anchorHash: z.string().optional(),
});

// GET /api/verify
receiptsRouter.get(
  "/verify",
  validateQuery(verifyQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const { anchorSeq, anchorHash } = req.query as unknown as {
      anchorSeq?: number;
      anchorHash?: string;
    };

    let anchor: { seq: number; hash: string } | null = null;
    if (typeof anchorSeq === "number" && anchorHash) {
      anchor = { seq: anchorSeq, hash: anchorHash };
    }

    const result = await verifyChain(user.id, anchor);
    res.json(result);
  })
);

