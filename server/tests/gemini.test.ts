import test from "node:test";
import assert from "node:assert/strict";
import { pickModels, GeminiModelInfo } from "../src/services/gemini.js";

test("pickModels selects preferred available models supporting generateContent in order", () => {
  const available: GeminiModelInfo[] = [
    { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-2.5-pro", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.7-flash", supportedGenerationMethods: ["generateContent"] },
  ];

  const preferred = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash"];
  const chosen = pickModels(available, preferred);

  assert.deepEqual(chosen, [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
  ]);
});

test("pickModels filters out models that do not support generateContent", () => {
  const available: GeminiModelInfo[] = [
    { name: "models/gemini-3.7-flash", supportedGenerationMethods: ["embedContent"] },
    { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
  ];

  const preferred = ["gemini-3.7-flash", "gemini-2.5-flash"];
  const chosen = pickModels(available, preferred);

  assert.deepEqual(chosen, ["gemini-2.5-flash"]);
});

test("pickModels excludes specialized models with image, tts, robotics, etc.", () => {
  const available: GeminiModelInfo[] = [
    { name: "models/gemini-3.8-flash-tts", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.1-flash-image", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-robotics-er-2-preview", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
  ];

  const preferred = ["nonexistent-model"];
  const chosen = pickModels(available, preferred);

  assert.deepEqual(chosen, ["gemini-2.5-flash"]);
});

