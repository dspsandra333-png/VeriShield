import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testsDir = path.resolve(__dirname, "../tests");

if (!fs.existsSync(testsDir)) {
  console.log("No tests directory found.");
  process.exit(0);
}

const files = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => path.join(testsDir, f));

if (files.length === 0) {
  console.log("No test files found in tests/");
  process.exit(0);
}

console.log(`Running ${files.length} test suites with node:test...\n`);

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);

