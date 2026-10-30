import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errors.js";
import { admin } from "../supabase.js";
import { createSampleReceipts } from "../services/sampleReceipts.js";
import type { AuthUser } from "../types.js";

export const demoRouter = Router();

demoRouter.use(requireAuth);

// Guard: 404 unless DEMO_MODE is true
demoRouter.use((_req: Request, res: Response, next) => {
  if (!env.DEMO_MODE) {
    res.status(404).json({ error: "Demo endpoints disabled." });
    return;
  }
  next();
});

const tamperSchema = z.object({
  seq: z.coerce.number().optional(),
});

// POST /api/demo/tamper
demoRouter.post(
  "/tamper",
  validateBody(tamperSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const { seq: requestedSeq } = req.body as { seq?: number };

    let targetSeq = requestedSeq;

    if (!targetSeq) {
      // Find second-newest receipt, or the only one
      const { data: rows, error: listErr } = await admin
        .from("receipts")
        .select("seq, demo_backup")
        .eq("user_id", user.id)
        .order("seq", { ascending: false })
        .limit(2);

      if (listErr || !rows || rows.length === 0) {
        res.status(404).json({ error: "No receipts available to tamper." });
        return;
      }

      targetSeq = rows.length >= 2 ? rows[1].seq : rows[0].seq;
    }

    // Retrieve current values
    const { data: current, error: getErr } = await admin
      .from("receipts")
      .select("explanation, risk_score, demo_backup")
      .eq("user_id", user.id)
      .eq("seq", targetSeq)
      .single();

    if (getErr || !current) {
      res.status(404).json({ error: `Receipt seq ${targetSeq} not found.` });
      return;
    }

    // Only backup if demo_backup is null
    const backup =
      current.demo_backup ||
      JSON.stringify({
        explanation: current.explanation,
        risk_score: current.risk_score,
      });

    const { error: updateErr } = await admin
      .from("receipts")
      .update({
        explanation: "Allowed: nothing suspicious (edited by hand)",
        risk_score: 0,
        demo_backup: typeof backup === "string" ? JSON.parse(backup) : backup,
      })
      .eq("user_id", user.id)
      .eq("seq", targetSeq);

    if (updateErr) {
      res.status(500).json({ error: "Failed to tamper with receipt." });
      return;
    }

    res.json({ ok: true, seq: targetSeq });
  })
);

// POST /api/demo/restore
demoRouter.post(
  "/restore",
  validateBody(tamperSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const { seq: requestedSeq } = req.body as { seq?: number };

    let targetSeq = requestedSeq;

    if (!targetSeq) {
      const { data: rows, error: listErr } = await admin
        .from("receipts")
        .select("seq, demo_backup")
        .eq("user_id", user.id)
        .not("demo_backup", "is", null)
        .limit(1);

      if (listErr || !rows || rows.length === 0) {
        res.status(404).json({ error: "No tampered receipts found to restore." });
        return;
      }
      targetSeq = rows[0].seq;
    }

    const { data: target, error: getErr } = await admin
      .from("receipts")
      .select("demo_backup")
      .eq("user_id", user.id)
      .eq("seq", targetSeq)
      .single();

    if (getErr || !target || !target.demo_backup) {
      res.status(404).json({ error: `Receipt seq ${targetSeq} has no backup to restore.` });
      return;
    }

    const backup = target.demo_backup as { explanation: string; risk_score: number };

    const { error: updateErr } = await admin
      .from("receipts")
      .update({
        explanation: backup.explanation,
        risk_score: backup.risk_score,
        demo_backup: null,
      })
      .eq("user_id", user.id)
      .eq("seq", targetSeq);

    if (updateErr) {
      res.status(500).json({ error: "Failed to restore receipt." });
      return;
    }

    res.json({ ok: true, seq: targetSeq });
  })
);

// POST /api/demo/reset
demoRouter.post(
  "/reset",
  asyncHandler(async (_req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;

    // Delete all receipts of calling user
    const { error: delErr } = await admin
      .from("receipts")
      .delete()
      .eq("user_id", user.id);

    if (delErr) {
      res.status(500).json({ error: "Failed to clear receipts for reset." });
      return;
    }

    // Recreate 3 sample receipts through real hash-chain code
    await createSampleReceipts(user.id);

    res.json({ ok: true });
  })
);

