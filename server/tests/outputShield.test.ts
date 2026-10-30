import test from "node:test";
import assert from "node:assert/strict";
import { scanOutput } from "../src/shield/outputShield.js";
import { env } from "../src/config.js";
import { fakeSecrets } from "../src/shield/fakeSecrets.js";

test("Output shield flags Canary token and blocks response", () => {
  const replyWithCanary = `Here is internal information: ${env.CANARY_TOKEN} please keep it confidential.`;
  const result = scanOutput(replyWithCanary);
  assert.equal(result.action, "blocked");
  assert.equal(result.receiptAction, "OUTPUT_BLOCKED");
  assert.equal(result.reason, "canary");
});

test("Output shield flags API keys and blocks response", () => {
  const secrets = fakeSecrets();
  const replyWithSecret = `Sure, you can use this key: ${secrets.GOOGLE_KEY} to call the service.`;
  const result = scanOutput(replyWithSecret);
  assert.equal(result.action, "blocked");
  assert.equal(result.receiptAction, "OUTPUT_BLOCKED");
  assert.equal(result.reason, "secret");
});

test("Output shield flags personal data and redacts response", () => {
  const replyWithPii = "You can contact our support rep at support.team@mycompany-service.co for assistance.";
  const result = scanOutput(replyWithPii);
  assert.equal(result.action, "redacted");
  assert.equal(result.receiptAction, "OUTPUT_REDACTED");
  assert.ok(result.sanitizedReply.includes("[REDACTED_EMAIL]"));
});

test("Output shield does NOT flag legitimate session placeholders", () => {
  const replyWithPlaceholders = "I have drafted the message for [NAME_1] and sent it to [EMAIL_1].";
  const result = scanOutput(replyWithPlaceholders);
  assert.equal(result.action, "clean");
  assert.equal(result.receiptAction, null);
  assert.equal(result.sanitizedReply, replyWithPlaceholders);
});

