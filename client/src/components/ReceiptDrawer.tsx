import React, { useState } from "react";
import { X, Copy, Check, ShieldCheck, Hash, Calendar, Layers, AlertCircle } from "lucide-react";
import type { Receipt } from "../types.js";
import { ActionBadge } from "./ActionBadge.js";

interface ReceiptDrawerProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export const ReceiptDrawer: React.FC<ReceiptDrawerProps> = ({ receipt, onClose }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  if (!receipt) return null;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(type);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Trust Receipt
                <span className="text-xs font-mono text-cyan-400">#{receipt.seq}</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Cryptographic Audit Record
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-6 space-y-5 flex-1">
          {/* Action & Tampered Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Decision Action:</span>
              <ActionBadge action={receipt.action} />
            </div>
            {receipt.demo_tampered && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded">
                Tampered (Demo Only)
              </span>
            )}
          </div>

          {/* Explanation Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Plain-Language Explanation
            </span>
            {receipt.explanation}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Audit Stage</span>
              </div>
              <p className="text-sm font-semibold text-white mt-1 capitalize">
                {receipt.stage}
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-semibold">
                <AlertCircle className="w-3 h-3 text-cyan-400" />
                <span>Risk Score</span>
              </div>
              <p className="text-sm font-semibold text-white mt-1">
                {receipt.risk_score} / 100
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Timestamp:</span>
            </div>
            <span className="font-mono text-slate-300 text-[11px]">{receipt.ts}</span>
          </div>

          {/* Categories Masked */}
          {receipt.categories && Object.keys(receipt.categories).length > 0 && (
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Masked Category Counts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(receipt.categories).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-300 font-mono"
                  >
                    {cat}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched Rules */}
          {receipt.matched_rules && receipt.matched_rules.length > 0 && (
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Triggered Rule IDs
              </span>
              <div className="flex flex-wrap gap-1.5">
                {receipt.matched_rules.map((rule) => (
                  <span
                    key={rule}
                    className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-rose-300 font-mono"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cryptographic Hashes */}
          <div className="p-3.5 bg-slate-950 border border-cyan-900/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-cyan-400" />
                Hash Chain Link
              </span>
              <span className="text-[10px] text-slate-500">SHA-256</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Previous Hash:</span>
              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                <span className="truncate max-w-[280px]">{receipt.prev_hash}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(receipt.prev_hash, "prev")}
                  className="text-slate-500 hover:text-cyan-400 ml-2"
                  title="Copy previous hash"
                >
                  {copiedHash === "prev" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Entry Hash (Block Digest):</span>
              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded border border-cyan-900/60 text-[10px] font-mono text-cyan-300">
                <span className="truncate max-w-[280px]">{receipt.entry_hash}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(receipt.entry_hash, "entry")}
                  className="text-cyan-400 hover:text-cyan-200 ml-2"
                  title="Copy entry hash"
                >
                  {copiedHash === "entry" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          VeriShield Cryptographic Proof of Decision
        </div>
      </div>
    </div>
  );
};

