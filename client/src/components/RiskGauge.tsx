import React from "react";
import type { Decision } from "../types.js";

interface RiskGaugeProps {
  score: number;
  decision?: Decision;
  showLabels?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  decision,
  showLabels = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let colorClass = "from-emerald-500 to-emerald-400";
  let textClass = "text-emerald-400";
  let bgClass = "bg-emerald-950/40 border-emerald-800/50";
  let decisionLabel = "Allow";

  if (clampedScore >= 71) {
    colorClass = "from-rose-500 to-rose-400";
    textClass = "text-rose-400";
    bgClass = "bg-rose-950/40 border-rose-800/50";
    decisionLabel = "Block";
  } else if (clampedScore >= 30) {
    colorClass = "from-amber-500 to-amber-400";
    textClass = "text-amber-400";
    bgClass = "bg-amber-950/40 border-amber-800/50";
    decisionLabel = "Warn";
  }

  return (
    <div className={`p-3.5 rounded-xl border ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Risk Assessment
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-base font-bold tracking-tight ${textClass}`}>
            {clampedScore}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ 100</span>
          {decision && (
            <span
              className={`ml-1 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                clampedScore >= 71
                  ? "bg-rose-900/60 text-rose-300 border border-rose-700/60"
                  : clampedScore >= 30
                  ? "bg-amber-900/60 text-amber-300 border border-amber-700/60"
                  : "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60"
              }`}
            >
              {decisionLabel}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar with 30 and 70 threshold markers */}
      <div className="relative w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
        {/* Fill */}
        <div
          className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-300 rounded-full`}
          style={{ width: `${clampedScore}%` }}
        />
        {/* Threshold indicator 30 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-950/80 z-10"
          style={{ left: "30%" }}
          title="Warn threshold: 30"
        />
        {/* Threshold indicator 70 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-950/80 z-10"
          style={{ left: "70%" }}
          title="Block threshold: 70"
        />
      </div>

      {showLabels && (
        <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 px-0.5 font-medium">
          <span>0 (Safe)</span>
          <span className="text-slate-400">30 (Warn)</span>
          <span className="text-slate-400">70 (Block)</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
};

