import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? issue.message : "Invalid request data.";
      res.status(400).json({ error: message });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? issue.message : "Invalid request query.";
      res.status(400).json({ error: message });
      return;
    }
    req.query = result.data as Record<string, unknown> as typeof req.query;
    next();
  };
}

