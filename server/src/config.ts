import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5055),
  NODE_ENV: z.string().default("development"),
  CLIENT_URL: z.string().min(1, "CLIENT_URL is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().min(1, "GEMINI_MODEL is required"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required").transform((val) => {
    let clean = val.trim();
    if (clean.endsWith("/rest/v1")) {
      clean = clean.slice(0, -"/rest/v1".length);
    }
    return clean.replace(/\/+$/, "");
  }),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  CANARY_TOKEN: z.string().min(1, "CANARY_TOKEN is required"),
  DEMO_MODE: z.preprocess((val) => {
    if (typeof val === "string") return val.toLowerCase() === "true";
    return Boolean(val);
  }, z.boolean()).default(false),
  SUPABASE_SECRET_KEY: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  SUPABASE_DB_URL: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingKeys = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .filter((k, idx, arr) => arr.indexOf(k) === idx);
  console.error(`Fatal configuration error: Missing or invalid environment variables: [${missingKeys.join(", ")}]`);
  process.exit(1);
}

export const env = parsed.data;

