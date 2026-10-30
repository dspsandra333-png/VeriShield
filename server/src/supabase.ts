import { createClient } from "@supabase/supabase-js";
import { env } from "./config.js";

// Service role admin client - for database operations, admin auth, verifying tokens
export const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Anon client - for password sign-in and token refresh only
export const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

