import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { getUserStats } from "../services/stats.js";
import type { AuthUser } from "../types.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);

// GET /api/stats
statsRouter.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const stats = await getUserStats(user.id);
    res.json(stats);
  })
);

