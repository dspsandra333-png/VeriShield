import React from "react";
import type { ReceiptAction } from "../types.js";

interface ActionBadgeProps {
  action: ReceiptAction;
  size?: "sm" | "md";
}

export const ActionBadge: React.FC<ActionBadgeProps> = ({ action, size = "md" }) => {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  switch (action) {
    case "ALLOWED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 ${sizeClasses}`}
        >
          ALLOWED
        </span>
      );

    case "REDACTED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 ${sizeClasses}`}
        >
          REDACTED
        </span>
      );

    case "WARNED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/60 ${sizeClasses}`}
        >
          WARNED
        </span>
      );

    case "BLOCKED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/60 ${sizeClasses}`}
        >
          BLOCKED
        </span>
      );

    case "OVERRIDDEN":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-purple-950/80 text-purple-400 border border-purple-800/60 ${sizeClasses}`}
        >
          OVERRIDDEN
        </span>
      );

    case "OUTPUT_BLOCKED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-red-950/80 text-red-400 border border-red-800/60 ${sizeClasses}`}
        >
          OUTPUT BLOCKED
        </span>
      );

    case "OUTPUT_REDACTED":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-teal-950/80 text-teal-400 border border-teal-800/60 ${sizeClasses}`}
        >
          OUTPUT REDACTED
        </span>
      );

    case "AI_UNAVAILABLE":
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}
        >
          AI UNAVAILABLE
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses}`}
        >
          {action}
        </span>
      );
  }
};

