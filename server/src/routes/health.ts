import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../config.js";
import { admin } from "../supabase.js";

export const healthRouter = Router();

let lastSupabaseCheckTime = 0;
let lastSupabaseStatus: "ok" | "fail" = "fail";

// Cached supabase check for 30s
async function checkSupabase(): Promise<"ok" | "fail"> {
  const now = Date.now();
  if (now - lastSupabaseCheckTime < 30_000) {
    return lastSupabaseStatus;
  }
  try {
    const { error } = await admin
      .from("receipts")
      .select("id", { count: "exact", head: true });
    lastSupabaseStatus = error ? "fail" : "ok";
  } catch {
    lastSupabaseStatus = "fail";
  }
  lastSupabaseCheckTime = now;
  return lastSupabaseStatus;
}

// Module-level variable to track resolved Gemini model
let resolvedModel: string | null = null;
export function setResolvedModel(model: string | null): void {
  resolvedModel = model;
}
export function getResolvedModel(): string | null {
  return resolvedModel;
}

healthRouter.get("/", async (_req: Request, res: Response) => {
  const supabaseStatus = await checkSupabase();
  res.json({
    ok: true,
    model: resolvedModel,
    configuredModel: env.GEMINI_MODEL,
    supabase: supabaseStatus,
    demoMode: env.DEMO_MODE,
    time: new Date().toISOString(),
  });
});

