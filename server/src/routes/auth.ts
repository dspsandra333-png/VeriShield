import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { admin, anon } from "../supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errors.js";
import type { AuthResponse, AuthUser } from "../types.js";

export const authRouter = Router();

// Rate limiter for authentication routes: 60 per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});
authRouter.use(authLimiter);

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be at most 80 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// POST /api/auth/register
authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createErr) {
      if (
        createErr.message?.toLowerCase().includes("already") ||
        createErr.code === "email_exists"
      ) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      res.status(400).json({ error: "Could not create account. Please check your details." });
      return;
    }

    if (!created?.user) {
      res.status(500).json({ error: "Failed to create account." });
      return;
    }

    // Sign in to retrieve tokens
    const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (loginErr || !loginData.session) {
      res.status(500).json({ error: "Account created but failed to sign in automatically." });
      return;
    }

    const session = loginData.session;
    const authUser: AuthUser = {
      id: created.user.id,
      name,
      email,
    };

    const response: AuthResponse = {
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
      user: authUser,
    };

    res.status(200).json(response);
  })
);

// POST /api/auth/login
authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const session = data.session;
    const user = data.user;
    const name = (user.user_metadata?.name as string) || email.split("@")[0] || "User";

    const authUser: AuthUser = {
      id: user.id,
      name,
      email,
    };

    const response: AuthResponse = {
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
      user: authUser,
    };

    res.status(200).json(response);
  })
);

// POST /api/auth/refresh
authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const { data, error } = await anon.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }

    const session = data.session;
    const user = data.user;
    const email = user.email || "";
    const name = (user.user_metadata?.name as string) || (email ? email.split("@")[0] : "User");

    const authUser: AuthUser = {
      id: user.id,
      name,
      email,
    };

    const response: AuthResponse = {
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
      user: authUser,
    };

    res.status(200).json(response);
  })
);

// GET /api/auth/me
authRouter.get(
  "/me",
  requireAuth,
  (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    res.json({ user });
  }
);

