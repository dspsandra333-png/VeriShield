import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errors.js";
import { admin } from "../supabase.js";
import {
  runRulesEval,
  startHybridEval,
  getHybridJobStatus,
} from "../services/evalRunner.js";
import type { AuthUser, EvalResult } from "../types.js";

export const evalRouter = Router();

evalRouter.use(requireAuth);

// Rate limiter: 5 per 10 minutes per user
const evalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (_req: Request, res: Response) => {
    const user = res.locals.user as AuthUser | undefined;
    return user?.id || "anonymous";
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Evaluation limit reached. Please wait before running another benchmark." },
});
evalRouter.use("/run", evalLimiter);

const runSchema = z.object({
  mode: z.enum(["rules", "hybrid"]),
});

// POST /api/eval/run
evalRouter.post(
  "/run",
  validateBody(runSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const { mode } = req.body as { mode: "rules" | "hybrid" };

    if (mode === "rules") {
      const result = await runRulesEval(user.id);
      res.status(200).json({ result });
      return;
    }

    const job = startHybridEval(user.id);
    res.status(202).json(job);
  })
);

const statusQuerySchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
});

// GET /api/eval/status
evalRouter.get(
  "/status",
  validateQuery(statusQuerySchema),
  (req: Request, res: Response) => {
    const { jobId } = req.query as { jobId: string };
    const status = getHybridJobStatus(jobId);

    if (!status) {
      res.status(404).json({ error: "Job not found or expired." });
      return;
    }

    res.json({
      state: status.state,
      done: status.done,
      total: status.total,
      result: status.result,
    });
  }
);

// GET /api/eval/latest
evalRouter.get(
  "/latest",
  asyncHandler(async (_req: Request, res: Response) => {
    const { data, error } = await admin
      .from("eval_runs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to fetch evaluation history." });
      return;
    }

    let latestRules: EvalResult | null = null;
    let latestHybrid: EvalResult | null = null;

    for (const r of data || []) {
      const mapped: EvalResult = {
        mode: r.mode as "rules" | "hybrid",
        attack_total: r.attack_total,
        attack_detected: r.attack_detected,
        normal_total: r.normal_total,
        false_alarms: r.false_alarms,
        detection_rate: Number(r.detection_rate),
        false_alarm_rate: Number(r.false_alarm_rate),
        pii_recall: r.pii_recall !== null ? Number(r.pii_recall) : null,
        llm_calls_ok: r.llm_calls_ok || 0,
        llm_calls_failed: r.llm_calls_failed || 0,
        missed: (r.missed || []) as string[],
        false_alarm_items: (r.false_alarm_items || []) as string[],
        created_at: r.created_at,
      };

      if (!latestRules && r.mode === "rules") {
        latestRules = mapped;
      }
      if (!latestHybrid && r.mode === "hybrid") {
        latestHybrid = mapped;
      }
      if (latestRules && latestHybrid) break;
    }

    res.json({
      rules: latestRules,
      hybrid: latestHybrid,
    });
  })
);

