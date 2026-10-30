import React from "react";
import { CheckCircle2, Circle, Trophy, Sparkles } from "lucide-react";
import { useDemoProgress } from "../context/DemoProgressContext.js";

export const DemoChecklist: React.FC = () => {
  const { steps, allDone, resetProgress } = useDemoProgress();

  const checklistItems = [
    { key: "allowedSent", label: "Normal message was ALLOWED" },
    { key: "redactedSent", label: "Private data was REDACTED in browser" },
    { key: "attackBlocked", label: "Prompt injection was BLOCKED" },
    { key: "outputCaught", label: "Output leak was intercepted (Shielded)" },
    { key: "verifyPassed", label: "Hash chain verification PASSED" },
    { key: "tamperDetected", label: "Record tampering was DETECTED" },
    { key: "restoredPassed", label: "Restored log verified clean again" },
  ] as const;

  const completedCount = Object.values(steps).filter(Boolean).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Demo Progress ({completedCount}/7)
        </span>
        <button
          onClick={resetProgress}
          className="text-[10px] text-slate-500 hover:text-slate-300 underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-1.5">
        {checklistItems.map(({ key, label }) => {
          const done = steps[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-2 text-xs py-1 transition ${
                done ? "text-slate-200" : "text-slate-500"
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-700 shrink-0" />
              )}
              <span className={done ? "font-medium" : ""}>{label}</span>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5 animate-pulse">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Full 7-Step Security &amp; Trust Flow Verified!</span>
        </div>
      )}
    </div>
  );
};

