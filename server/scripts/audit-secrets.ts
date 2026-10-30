import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

async function runAudit(): Promise<void> {
  console.log("Running VeriShield Secret Audit...");
  let hasErrors = false;

  const serverEnvPath = path.join(rootDir, "server", ".env");
  const clientEnvPath = path.join(rootDir, "client", ".env");
  const gitignorePath = path.join(rootDir, ".gitignore");

  // 1. Check .gitignore ignores .env files
  if (!fs.existsSync(gitignorePath)) {
    console.error("[FAIL] Root .gitignore is missing!");
    hasErrors = true;
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    const hasEnvIgnored =
      gitignoreContent.includes(".env") || gitignoreContent.includes("**/.env");
    if (!hasEnvIgnored) {
      console.error("[FAIL] .gitignore does not ignore .env files!");
      hasErrors = true;
    } else {
      console.log("[PASS] .gitignore correctly ignores .env files.");
    }
  }

  // 2. Check required variables in server/.env and client/.env
  const serverEnv = parseEnvFile(serverEnvPath);
  const clientEnv = parseEnvFile(clientEnvPath);

  const requiredServerVars = [
    "PORT",
    "NODE_ENV",
    "CLIENT_URL",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CANARY_TOKEN",
    "DEMO_MODE",
  ];

  const requiredClientVars = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_API_BASE_URL",
  ];

  for (const key of requiredServerVars) {
    if (!serverEnv[key] || serverEnv[key].trim() === "") {
      console.error(`[FAIL] server/.env missing required variable: ${key}`);
      hasErrors = true;
    }
  }

  for (const key of requiredClientVars) {
    if (!clientEnv[key] || clientEnv[key].trim() === "") {
      console.error(`[FAIL] client/.env missing required variable: ${key}`);
      hasErrors = true;
    }
  }

  // 3. Collect secret values to scan for in repository
  const secretValuesToScan: string[] = [
    serverEnv["GEMINI_API_KEY"],
    serverEnv["SUPABASE_SERVICE_ROLE_KEY"],
    serverEnv["SUPABASE_SECRET_KEY"],
    serverEnv["SUPABASE_ANON_KEY"],
    clientEnv["VITE_SUPABASE_ANON_KEY"],
  ].filter((v): v is string => Boolean(v && v.trim().length >= 10));

  // 4. Runtime assembled regex patterns for provider key shapes
  const providerPatterns = [
    // Google AI key: "AI" + "za" + 35 chars
    new RegExp(["AI", "za", "[0-9A-Za-z\\-_]{35}"].join("")),
    // OpenAI sk key: "sk" + "-" + 32+ chars
    new RegExp(["sk", "-", "[A-Za-z0-9]{32,}"].join("")),
    // GitHub PAT: "gh" + "p_" + 36 chars
    new RegExp(["gh", "p_", "[a-zA-Z0-9]{36}"].join("")),
    // AWS AKIA key: "AK" + "IA" + 16 chars
    new RegExp(["\\b", "AK", "IA", "[0-9A-Z]{16}", "\\b"].join("")),
    // Slack token: "xo" + "x[baprs]-"
    new RegExp(["xo", "x[baprs]-", "[0-9a-zA-Z\\-]{20,}"].join("")),
    // JWT: three segments starting with "ey" + "J"
    new RegExp(["ey", "J[a-zA-Z0-9_\\-]{15,}\\.", "ey", "J[a-zA-Z0-9_\\-]{15,}\\.[a-zA-Z0-9_\\-]{15,}"].join("")),
  ];

  // 5. Walk repository files
  const skippedDirs = new Set(["node_modules", "dist", "build", ".git", ".gemini", "coverage"]);
  const filesToScan: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skippedDirs.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const fullPath = path.join(currentDir, entry.name);
        // Skip .env files themselves
        if (entry.name === ".env" || entry.name.endsWith(".env")) {
          continue;
        }
        filesToScan.push(fullPath);
      }
    }
  }

  walk(rootDir);

  let leakFindings = 0;

  for (const file of filesToScan) {
    let content = "";
    try {
      content = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    // Check exact secret values
    let exactMatches = 0;
    for (const secret of secretValuesToScan) {
      if (content.includes(secret)) {
        exactMatches++;
      }
    }

    if (exactMatches > 0) {
      console.error(
        `[FAIL] Secret value occurred in file: ${path.relative(rootDir, file)} (count: ${exactMatches})`
      );
      leakFindings++;
      hasErrors = true;
    }

    // Check provider-shaped signatures (skip audit-secrets.ts itself)
    if (!file.endsWith("audit-secrets.ts")) {
      for (const pattern of providerPatterns) {
        if (pattern.test(content)) {
          console.error(
            `[FAIL] Provider key pattern detected in file: ${path.relative(rootDir, file)}`
          );
          leakFindings++;
          hasErrors = true;
        }
      }
    }
  }

  if (leakFindings === 0) {
    console.log(`[PASS] Scanned ${filesToScan.length} files. Zero secrets or provider keys found.`);
  }

  if (hasErrors) {
    console.error("\nAudit failed with errors.");
    process.exit(1);
  } else {
    console.log("\nAll secret audit checks passed successfully.");
  }
}

runAudit().catch((err) => {
  console.error("Audit script exception:", err);
  process.exit(1);
});
