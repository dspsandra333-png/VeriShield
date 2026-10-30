import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectAll } from "./detectors.js";
import { mask, createSessionPlaceholderMap } from "./mask.js";
import { restore } from "./restore.js";
import { fakeSecrets } from "./fakeSecrets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Client Shield & Masking Engine", () => {
  it("detects all test cases from pii-testset.json", () => {
    const fixturePath = path.resolve(__dirname, "../../../server/data/pii-testset.json");
    let raw = fs.readFileSync(fixturePath, "utf-8");
    const secrets = fakeSecrets();

    for (const [k, v] of Object.entries(secrets)) {
      raw = raw.replaceAll(`{{${k}}}`, v);
    }

    const testcases = JSON.parse(raw) as Array<{
      text: string;
      expected: Array<{ type: string; value: string }>;
      mustNotMatch?: string[];
    }>;

    for (let i = 0; i < testcases.length; i++) {
      const tc = testcases[i];
      const matches = detectAll(tc.text);
      const matchedTypes = matches.map((m) => m.type);

      for (const exp of tc.expected) {
        expect(
          matchedTypes,
          `Case #${i} failed to detect expected ${exp.type} in "${tc.text}"`
        ).toContain(exp.type);
      }

      if (tc.mustNotMatch) {
        for (const forbidden of tc.mustNotMatch) {
          expect(
            matchedTypes,
            `Case #${i} falsely matched forbidden ${forbidden} in "${tc.text}"`
          ).not.toContain(forbidden);
        }
      }
    }
  });

  it("mask then restore round trip returns original text", () => {
    const sessionMap = createSessionPlaceholderMap();
    const secrets = fakeSecrets();
    const originalText = `Hello, my email is test.user@example.com, my phone is +91 98765 43210, and my test key is ${secrets.GOOGLE_KEY}.`;

    const { maskedText, items } = mask(originalText, sessionMap);
    expect(items.length).toBeGreaterThanOrEqual(3);

    // Verify sensitive values are absent in masked text
    expect(maskedText).not.toContain("test.user@example.com");
    expect(maskedText).not.toContain("98765 43210");
    expect(maskedText).not.toContain(secrets.GOOGLE_KEY);

    const restored = restore(maskedText, sessionMap);
    expect(restored).toBe(originalText);
  });

  it("same sensitive value receives the same placeholder across messages in a session", () => {
    const sessionMap = createSessionPlaceholderMap();
    const text1 = "My email is user@domain.com.";
    const text2 = "Please send invoice to user@domain.com again.";

    const res1 = mask(text1, sessionMap);
    const res2 = mask(text2, sessionMap);

    const item1 = res1.items.find((i) => i.type === "EMAIL");
    const item2 = res2.items.find((i) => i.type === "EMAIL");

    expect(item1?.placeholder).toBe("[EMAIL_1]");
    expect(item2?.placeholder).toBe("[EMAIL_1]");
  });

  it("skipping an optional item leaves its original value in text", () => {
    const sessionMap = createSessionPlaceholderMap();
    const text = "Please contact Dr. Vikram Patel for details.";

    // First run to detect
    const preview = mask(text, sessionMap);
    const nameItem = preview.items.find((i) => i.type === "NAME");
    expect(nameItem).toBeDefined();

    // Skip the name item
    const skipped = new Set<string>();
    if (nameItem) skipped.add(nameItem.placeholder);

    const resultWithSkip = mask(text, sessionMap, { skippedPlaceholders: skipped });
    expect(resultWithSkip.maskedText).toContain("Dr. Vikram Patel");
  });

  it("restore leaves [REDACTED_*] markers and unknown placeholders untouched", () => {
    const sessionMap = createSessionPlaceholderMap();
    const aiText = "Here is [REDACTED_EMAIL] and an unknown [CUSTOM_99].";
    const restored = restore(aiText, sessionMap);
    expect(restored).toBe(aiText);
  });
});

