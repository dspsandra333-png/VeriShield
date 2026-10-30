import { admin } from "../src/supabase.js";

export async function runDbCheck(): Promise<{ ok: boolean; results: Record<string, boolean> }> {
  const results: Record<string, boolean> = {};

  // 1. Check Supabase Auth Admin access
  try {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      console.log(`[FAIL] Supabase Auth Admin: ${error.message}`);
      results["auth"] = false;
    } else {
      console.log(`[PASS] Supabase Auth Admin accessible`);
      results["auth"] = true;
    }
  } catch (err) {
    console.log(`[FAIL] Supabase Auth Admin exception: ${err instanceof Error ? err.message : String(err)}`);
    results["auth"] = false;
  }

  // 2. Check public.receipts table
  try {
    const { error } = await admin.from("receipts").select("id").limit(1);
    if (error) {
      console.log(`[FAIL] Table public.receipts: ${error.message} (code: ${error.code})`);
      results["receipts"] = false;
    } else {
      console.log(`[PASS] Table public.receipts exists and is accessible`);
      results["receipts"] = true;
    }
  } catch (err) {
    console.log(`[FAIL] Table public.receipts exception: ${err instanceof Error ? err.message : String(err)}`);
    results["receipts"] = false;
  }

  // 3. Check public.eval_runs table
  try {
    const { error } = await admin.from("eval_runs").select("id").limit(1);
    if (error) {
      console.log(`[FAIL] Table public.eval_runs: ${error.message} (code: ${error.code})`);
      results["eval_runs"] = false;
    } else {
      console.log(`[PASS] Table public.eval_runs exists and is accessible`);
      results["eval_runs"] = true;
    }
  } catch (err) {
    console.log(`[FAIL] Table public.eval_runs exception: ${err instanceof Error ? err.message : String(err)}`);
    results["eval_runs"] = false;
  }

  const allOk = Object.values(results).every(Boolean);
  return { ok: allOk, results };
}

if (process.argv[1]?.endsWith("db-check.ts") || process.argv[1]?.endsWith("db-check.js")) {
  runDbCheck().then(({ ok }) => {
    process.exit(ok ? 0 : 1);
  });
}
