import type { Request, Response, NextFunction } from "express";
import { admin } from "../supabase.js";
import { sha256 } from "../utils/hash.js";
import type { AuthUser } from "../types.js";

interface CachedUser {
  user: AuthUser;
  expiresAt: number;
}

// In-memory verification cache: 30 seconds, keyed by sha256(token)
const authCache = new Map<string, CachedUser>();

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Please log in again." });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Please log in again." });
    return;
  }

  const tokenHash = sha256(token);
  const now = Date.now();

  const cached = authCache.get(tokenHash);
  if (cached && cached.expiresAt > now) {
    res.locals.user = cached.user;
    next();
    return;
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      authCache.delete(tokenHash);
      res.status(401).json({ error: "Please log in again." });
      return;
    }

    const u = data.user;
    const email = u.email || "";
    const name = (u.user_metadata?.name as string) || (email ? email.split("@")[0] : "User");

    const authUser: AuthUser = {
      id: u.id,
      name,
      email,
    };

    authCache.set(tokenHash, {
      user: authUser,
      expiresAt: now + 30_000,
    });

    res.locals.user = authUser;
    next();
  } catch {
    res.status(401).json({ error: "Please log in again." });
  }
}

