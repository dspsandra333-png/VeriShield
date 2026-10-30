import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  color?: "cyan" | "emerald" | "amber" | "rose" | "purple" | "slate";
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  color = "cyan",
}) => {
  const colorMap = {
    cyan: "text-cyan-400 bg-cyan-950/40 border-cyan-800/50",
    emerald: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
    amber: "text-amber-400 bg-amber-950/40 border-amber-800/50",
    rose: "text-rose-400 bg-rose-950/40 border-rose-800/50",
    purple: "text-purple-400 bg-purple-950/40 border-purple-800/50",
    slate: "text-slate-400 bg-slate-900 border-slate-800",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colorMap[color]}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        {subtext && <p className="text-[11px] text-slate-500 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
};

