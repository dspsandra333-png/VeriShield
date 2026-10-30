import test from "node:test";
import assert from "node:assert/strict";
import { getDecision } from "../src/services/scoring.js";
import { evaluateRules } from "../src/shield/injectionRules.js";

test("Decision boundaries match exact thresholds (29 allow, 30 warn, 70 warn, 71 block)", () => {
  assert.equal(getDecision(0), "allow");
  assert.equal(getDecision(29), "allow");
  assert.equal(getDecision(30), "warn");
  assert.equal(getDecision(50), "warn");
  assert.equal(getDecision(70), "warn");
  assert.equal(getDecision(71), "block");
  assert.equal(getDecision(100), "block");
});

test("Rules do not trigger on tricky innocent sentences", () => {
  const trickyNormals = [
    "How do I ignore errors in Python using try-except blocks?",
    "Please ignore my previous email and use this updated attachment instead.",
    "Can you explain what a system prompt is in modern LLM architecture?",
    "How to set up password hashing with bcrypt?",
    "Explain what prompt injection is and how to prevent it.",
  ];

  for (const sentence of trickyNormals) {
    const { rulesScore, matchedRules } = evaluateRules(sentence);
    assert.equal(
      rulesScore,
      0,
      `Innocent prompt falsely matched rules [${matchedRules.join(", ")}]: "${sentence}"`
    );
  }
});

