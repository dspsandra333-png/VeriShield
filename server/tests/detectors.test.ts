import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { luhnCheck, detectServerPii } from "../src/shield/detectors.js";
import { fakeSecrets } from "../src/shield/fakeSecrets.js";

test("Luhn algorithm validates card numbers correctly", () => {
  // Valid Luhn numbers
  assert.equal(luhnCheck("4532015012345671"), true);
  assert.equal(luhnCheck("5555 5555 5555 4444"), true);

  // Invalid Luhn numbers
  assert.equal(luhnCheck("4532015012345679"), false);
  assert.equal(luhnCheck("1234567890123456"), false);
  assert.equal(luhnCheck("123"), false);
});

test("Server detectors match fixtures from pii-testset.json", () => {
  const secrets = fakeSecrets();
  const url = new URL("../data/pii-testset.json", import.meta.url);
  let raw = fs.readFileSync(url, "utf-8");

  for (const [k, v] of Object.entries(secrets)) {
    raw = raw.replaceAll(`{{${k}}}`, v);
  }

  const cases = JSON.parse(raw) as Array<{
    text: string;
    expected: Array<{ type: string; value: string }>;
    mustNotMatch?: string[];
  }>;

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    const matches = detectServerPii(tc.text);
    const matchedTypes = matches.map((m) => m.type);

    for (const exp of tc.expected) {
      if (exp.type !== "NAME" && exp.type !== "DOB") {
        assert.ok(
          matchedTypes.includes(exp.type as any),
          `Case #${i} failed to detect expected type ${exp.type} in text "${tc.text}"`
        );
      }
    }

    if (tc.mustNotMatch) {
      for (const forbidden of tc.mustNotMatch) {
        assert.ok(
          !matchedTypes.includes(forbidden as any),
          `Case #${i} falsely matched forbidden type ${forbidden} in text "${tc.text}"`
        );
      }
    }
  }
});
