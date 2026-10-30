import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config.js";
import { requestLogger } from "./utils/logger.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { shieldRouter } from "./routes/shield.js";
import { receiptsRouter } from "./routes/receipts.js";
import { statsRouter } from "./routes/stats.js";
import { demoRouter } from "./routes/demo.js";
import { evalRouter } from "./routes/eval.js";

export const app = express();

// Trust proxy for rate-limiting and reverse proxies (e.g. Render)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing
const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (like curl, scripts, smoke tests)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Payload size limit and parsing
app.use(express.json({ limit: "64kb" }));

// Disable caching for all API responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Request logger (privacy-preserving, no bodies or queries)
app.use(requestLogger);

// General rate limiter: 120 per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(generalLimiter);

// API Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/demo", demoRouter);
app.use("/api/eval", evalRouter);
app.use("/api", receiptsRouter);
app.use("/api", statsRouter);
app.use("/api", shieldRouter);

// 404 handler (using app.use for compatibility with Express 4 and Express 5)
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
  if (res.headersSent) {
    return;
  }
  if (errorMessage === "Not allowed by CORS") {
    res.status(403).json({ error: "CORS error: Origin not allowed." });
    return;
  }
  res.status(500).json({ error: "An unexpected error occurred. Please try again." });
});
