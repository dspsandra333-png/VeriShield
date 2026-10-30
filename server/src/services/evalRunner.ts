import fs from "node:fs";
import { computeRiskScore } from "./scoring.js";
import { detectServerPii } from "../shield/detectors.js";
import { fakeSecrets } from "../shield/fakeSecrets.js";
import { admin } from "../supabase.js";
import type { EvalResult, PiiType } from "../types.js";

interface TestSetData {
  attacks: string[];
  normals: string[];
}

interface PiiTestCase {
  text: string;
  expected: Array<{ type: PiiType; value: string }>;
  mustNotMatch?: PiiType[];
}

function loadTestSet(): TestSetData {
  const url = new URL("../../data/testset.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  return JSON.parse(raw) as TestSetData;
}

function loadPiiTestSet(): PiiTestCase[] {
  const url = new URL("../../data/pii-testset.json", import.meta.url);
  const raw = fs.readFileSync(url, "utf-8");
  const secrets = fakeSecrets();

  let populated = raw
    .replaceAll("{{GOOGLE_KEY}}", secrets.GOOGLE_KEY)
    .replaceAll("{{OPENAI_KEY}}", secrets.OPENAI_KEY)
    .replaceAll("{{GITHUB_TOKEN}}", secrets.GITHUB_TOKEN)
    .replaceAll("{{AWS_KEY}}", secrets.AWS_KEY)
    .replaceAll("{{SLACK_TOKEN}}", secrets.SLACK_TOKEN)
    .replaceAll("{{JWT}}", secrets.JWT);

  return JSON.parse(populated) as PiiTestCase[];
}

export async function runRulesEval(userId?: string): Promise<EvalResult> {
  const testset = loadTestSet();
  const piiTestset = loadPiiTestSet();

  let attackDetected = 0;
  const missed: string[] = [];

  for (const attack of testset.attacks) {
    const res = await computeRiskScore(attack, true); // skip LLM
    if (res.risk_score >= 30) {
      attackDetected++;
    } else {
      missed.push(attack);
    }
  }

  let falseAlarms = 0;
  const falseAlarmItems: string[] = [];

  for (const normal of testset.normals) {
    const res = await computeRiskScore(normal, true); // skip LLM
    if (res.risk_score >= 30) {
      falseAlarms++;
      falseAlarmItems.push(normal);
    }
  }

  // PII Recall
  let totalPiiExpected = 0;
  let totalPiiMatched = 0;

  for (const tc of piiTestset) {
    const matches = detectServerPii(tc.text);
    const matchedTypes = matches.map((m) => m.type);

    for (const exp of tc.expected) {
      // Server checks API_KEY, EMAIL, CARD, AADHAAR, PAN, PHONE, UPI
      if (exp.type !== "NAME" && exp.type !== "DOB") {
        totalPiiExpected++;
        if (matchedTypes.includes(exp.type)) {
          totalPiiMatched++;
        }
      }
    }
  }

  const detectionRate = Math.round((attackDetected / testset.attacks.length) * 10000) / 100;
  const falseAlarmRate = Math.round((falseAlarms / testset.normals.length) * 10000) / 100;
  const piiRecall =
    totalPiiExpected > 0
      ? Math.round((totalPiiMatched / totalPiiExpected) * 10000) / 100
      : 100;

  const result: EvalResult = {
    mode: "rules",
    attack_total: testset.attacks.length,
    attack_detected: attackDetected,
    normal_total: testset.normals.length,
    false_alarms: falseAlarms,
    detection_rate: detectionRate,
    false_alarm_rate: falseAlarmRate,
    pii_recall: piiRecall,
    llm_calls_ok: 0,
    llm_calls_failed: 0,
    missed,
    false_alarm_items: falseAlarmItems,
    created_at: new Date().toISOString(),
  };

  if (userId) {
    await admin.from("eval_runs").insert({
      user_id: userId,
      mode: "rules",
      attack_total: result.attack_total,
      attack_detected: result.attack_detected,
      normal_total: result.normal_total,
      false_alarms: result.false_alarms,
      detection_rate: result.detection_rate,
      false_alarm_rate: result.false_alarm_rate,
      pii_recall: result.pii_recall,
      llm_calls_ok: 0,
      llm_calls_failed: 0,
      missed: result.missed,
      false_alarm_items: result.false_alarm_items,
    });
  }

  return result;
}

// Background hybrid evaluation jobs
interface HybridJobState {
  userId: string;
  state: "running" | "done" | "error";
  done: number;
  total: number;
  result?: EvalResult;
  createdAt: number;
}

const hybridJobs = new Map<string, HybridJobState>();

export function getHybridJobStatus(jobId: string): HybridJobState | null {
  const job = hybridJobs.get(jobId);
  if (!job) return null;
  // Cleanup jobs older than 30 mins
  if (Date.now() - job.createdAt > 30 * 60 * 1000) {
    hybridJobs.delete(jobId);
    return null;
  }
  return job;
}

export function startHybridEval(userId: string): { jobId: string; total: number } {
  const testset = loadTestSet();
  const total = testset.attacks.length + testset.normals.length;
  const jobId = `eval-${userId}-${Date.now()}`;

  const jobState: HybridJobState = {
    userId,
    state: "running",
    done: 0,
    total,
    createdAt: Date.now(),
  };

  hybridJobs.set(jobId, jobState);

  // Execute in background
  (async () => {
    let attackDetected = 0;
    const missed: string[] = [];
    let falseAlarms = 0;
    const falseAlarmItems: string[] = [];
    let llmCallsOk = 0;
    let llmCallsFailed = 0;

    for (const attack of testset.attacks) {
      await new Promise((r) => setTimeout(r, 1200)); // sequential spacing
      const res = await computeRiskScore(attack, false);
      if (res.llmAvailable) {
        llmCallsOk++;
      } else {
        llmCallsFailed++;
      }

      if (res.risk_score >= 30) {
        attackDetected++;
      } else {
        missed.push(attack);
      }
      jobState.done++;
    }

    for (const normal of testset.normals) {
      await new Promise((r) => setTimeout(r, 1200));
      const res = await computeRiskScore(normal, false);
      if (res.llmAvailable) {
        llmCallsOk++;
      } else {
        llmCallsFailed++;
      }

      if (res.risk_score >= 30) {
        falseAlarms++;
        falseAlarmItems.push(normal);
      }
      jobState.done++;
    }

    const detectionRate = Math.round((attackDetected / testset.attacks.length) * 10000) / 100;
    const falseAlarmRate = Math.round((falseAlarms / testset.normals.length) * 10000) / 100;

    const finalResult: EvalResult = {
      mode: "hybrid",
      attack_total: testset.attacks.length,
      attack_detected: attackDetected,
      normal_total: testset.normals.length,
      false_alarms: falseAlarms,
      detection_rate: detectionRate,
      false_alarm_rate: falseAlarmRate,
      pii_recall: null,
      llm_calls_ok: llmCallsOk,
      llm_calls_failed: llmCallsFailed,
      missed,
      false_alarm_items: falseAlarmItems,
      created_at: new Date().toISOString(),
    };

    jobState.result = finalResult;
    jobState.state = "done";

    await admin.from("eval_runs").insert({
      user_id: userId,
      mode: "hybrid",
      attack_total: finalResult.attack_total,
      attack_detected: finalResult.attack_detected,
      normal_total: finalResult.normal_total,
      false_alarms: finalResult.false_alarms,
      detection_rate: finalResult.detection_rate,
      false_alarm_rate: finalResult.false_alarm_rate,
      pii_recall: null,
      llm_calls_ok: llmCallsOk,
      llm_calls_failed: llmCallsFailed,
      missed: finalResult.missed,
      false_alarm_items: finalResult.false_alarm_items,
    });
  })().catch(() => {
    jobState.state = "error";
  });

  return { jobId, total };
}

