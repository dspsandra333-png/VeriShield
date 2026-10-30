import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifyReceiptChainInBrowser,
  MinimalReceiptForVerification,
} from "./chainVerify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Browser Cryptographic Chain Verification", () => {
  const vectorPath = path.resolve(__dirname, "../../../server/data/chain-vector.json");
  const raw = fs.readFileSync(vectorPath, "utf-8");
  const goldenChain = JSON.parse(raw) as MinimalReceiptForVerification[];

  it("golden vector verifies with browser WebCrypto implementation", async () => {
    const result = await verifyReceiptChainInBrowser(goldenChain);
    expect(result.valid).toBe(true);
    expect(result.checked).toBe(6);
    expect(result.broken_at_seq).toBeNull();
    expect(result.head_seq).toBe(6);
  });

  it("tampering any single field breaks browser verification at the exact sequence", async () => {
    const tampered = JSON.parse(JSON.stringify(goldenChain)) as MinimalReceiptForVerification[];
    tampered[1].explanation = "Manipulated text";

    const result = await verifyReceiptChainInBrowser(tampered);
    expect(result.valid).toBe(false);
    expect(result.broken_at_seq).toBe(2);
  });
});

