import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  // Strip query parameters from logged path for privacy
  const rawUrl = req.originalUrl || req.url;
  const pathOnly = rawUrl.split("?")[0] || "/";

  res.on("finish", () => {
    const elapsed = Date.now() - start;
    // Format: [METHOD] /path status ms
    console.log(`[${req.method}] ${pathOnly} ${res.statusCode} ${elapsed}ms`);
  });

  next();
}

