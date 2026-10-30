import React from "react";
import type { Receipt } from "../types.js";
import { ActionBadge } from "./ActionBadge.js";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface ReceiptCardProps {
  receipt: Receipt;
  onSelect: (receipt: Receipt) => void;
  isTamperedTarget?: boolean;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  onSelect,
  isTamperedTarget = false,
}) => {
  return (
    <div
      onClick={() => onSelect(receipt)}
      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
        isTamperedTarget
          ? "bg-rose-950/30 border-rose-700/80 hover:bg-rose-950/50"
          : receipt.demo_tampered
          ? "bg-amber-950/20 border-amber-800/60 hover:bg-amber-950/40"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="font-mono text-xs font-bold text-slate-400 shrink-0">
          #{receipt.seq}
        </span>
        <ActionBadge action={receipt.action} size="sm" />
        <span className="text-slate-300 truncate max-w-xs sm:max-w-md">
          {receipt.explanation}
        </span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isTamperedTarget && (
          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800/60">
            <AlertTriangle className="w-3 h-3" />
            Broken
          </span>
        )}
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          {receipt.entry_hash.slice(0, 8)}...
        </span>
        <ArrowRight className="w-4 h-4 text-slate-500 hover:text-cyan-400" />
      </div>
    </div>
  );
};

