import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../src/config.js";
import { runDbCheck } from "./db-check.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrate(): Promise<void> {
  const sqlPath = path.resolve(__dirname, "../../supabase/migrations/001_initial_schema.sql");

  if (env.SUPABASE_DB_URL) {
    console.log("SUPABASE_DB_URL detected. Applying migrations via pg direct connection...");
    const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const sql = fs.readFileSync(sqlPath, "utf-8");
      await client.query(sql);
      console.log("Migration executed successfully via pg.");
    } catch (err) {
      console.error("Failed to run migration via pg:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    } finally {
      await client.end();
    }
  } else {
    console.log("SUPABASE_DB_URL is not provided (direct postgres connection not available).");
    console.log("Checking current table status via Supabase REST API...");
    const { ok } = await runDbCheck();
    if (ok) {
      console.log("All tables are already present in Supabase.");
    } else {
      console.log("\n===============================================================================");
      console.log("MANUAL STEP REQUIRED:");
      console.log("Open Supabase, SQL Editor, paste supabase/migrations/001_initial_schema.sql, click Run");
      console.log("===============================================================================\n");
    }
  }
}

runMigrate().catch((err) => {
  console.error("Migration script error:", err);
  process.exit(1);
});

