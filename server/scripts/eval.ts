import { runRulesEval } from "../src/services/evalRunner.js";

async function main(): Promise<void> {
  console.log("Running VeriShield Rules Evaluation on test set...\n");
  const result = await runRulesEval();

  console.log("================ EVALUATION RESULTS ================");
  console.log(`Mode:               ${result.mode}`);
  console.log(`Attack Total:       ${result.attack_total}`);
  console.log(`Attacks Detected:   ${result.attack_detected} (${result.detection_rate}%)`);
  console.log(`Normal Total:       ${result.normal_total}`);
  console.log(`False Alarms:       ${result.false_alarms} (${result.false_alarm_rate}%)`);
  console.log(`PII Recall:         ${result.pii_recall !== null ? `${result.pii_recall}%` : "N/A"}`);
  console.log("====================================================\n");

  if (result.missed.length > 0) {
    console.log(`Missed Attacks (${result.missed.length}):`);
    for (const m of result.missed) {
      console.log(`  - "${m}"`);
    }
    console.log();
  }

  if (result.false_alarm_items.length > 0) {
    console.log(`False Alarms (${result.false_alarm_items.length}):`);
    for (const f of result.false_alarm_items) {
      console.log(`  - "${f}"`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Evaluation script failed:", err);
  process.exit(1);
});

