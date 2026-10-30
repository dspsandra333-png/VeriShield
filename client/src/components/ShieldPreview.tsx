import React, { useState } from "react";
import {
  ShieldAlert,
  Check,
  X,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { DetectedItem, PreviewResponse } from "../types.js";
import { RiskGauge } from "./RiskGauge.js";

interface ShieldPreviewProps {
  originalText: string;
  maskedText: string;
  items: DetectedItem[];
  previewData: PreviewResponse | null;
  loading: boolean;
  skippedPlaceholders: Set<string>;
  onToggleItem: (placeholder: string) => void;
  onCancel: () => void;
  onApprove: (confirmMode: "none" | "warn_accepted" | "block_override") => void;
}

export const ShieldPreview: React.FC<ShieldPreviewProps> = ({
  originalText,
  maskedText,
  items,
  previewData,
  loading,
  skippedPlaceholders,
  onToggleItem,
  onCancel,
  onApprove,
}) => {
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const decision = previewData?.decision || "allow";
  const riskScore = previewData?.risk_score ?? 0;

  // Render original text with highlights using React nodes (Rule P7: Never innerHTML!)
  const renderHighlightedText = () => {
    if (items.length === 0) {
      return <span>{originalText}</span>;
    }

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    // Filter items to only active (not skipped)
    const activeItems = items
      .filter((i) => !skippedPlaceholders.has(i.placeholder))
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < activeItems.length; i++) {
      const item = activeItems[i];
      if (item.start > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`}>{originalText.slice(lastIndex, item.start)}</span>
        );
      }
      segments.push(
        <mark
          key={`highlight-${item.placeholder}-${i}`}
          className="bg-cyan-950 text-cyan-200 border border-cyan-700/80 px-1 py-0.5 rounded font-mono text-xs mx-0.5 inline-block"
          title={`${item.type} -> ${item.placeholder}`}
        >
          {originalText.slice(item.start, item.end)}
          <span className="text-[10px] text-cyan-400 font-bold ml-1">[{item.type}]</span>
        </mark>
      );
      lastIndex = item.end;
    }

    if (lastIndex < originalText.length) {
      segments.push(
        <span key={`text-${lastIndex}`}>{originalText.slice(lastIndex)}</span>
      );
    }

    return segments;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                VeriShield Input Review
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Client Privacy Boundary
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Review masked personal data and security risk before transmission.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Risk Gauge */}
          <RiskGauge score={riskScore} decision={decision} />

          {/* Original with highlights */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">
                Local Device View (Never Sent)
              </span>
              <span className="text-[10px] text-cyan-400 font-medium">
                {items.length} item{items.length === 1 ? "" : "s"} detected
              </span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
              {renderHighlightedText()}
            </div>
          </div>

          {/* Masked text preview */}
          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sanitized Text Transmitted to Assistant
            </span>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
              {maskedText}
            </div>
          </div>

          {/* Detected items list with toggles */}
          {items.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Protected Data Items
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const isSkipped = skippedPlaceholders.has(item.placeholder);
                  return (
                    <div
                      key={item.placeholder}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                        isSkipped
                          ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                          : "bg-slate-950 border-cyan-900/50 text-cyan-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-[11px] font-bold text-cyan-400 shrink-0">
                          {item.placeholder}
                        </span>
                        <span className="truncate text-slate-400 text-[11px]">
                          {item.original}
                        </span>
                      </div>
                      <div className="shrink-0 ml-2">
                        {item.optional ? (
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400 select-none">
                            <input
                              type="checkbox"
                              checked={!isSkipped}
                              onChange={() => onToggleItem(item.placeholder)}
                              className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span>Hide</span>
                          </label>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-950 text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Why this score? breakdown */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white"
            >
              <span>Why this score?</span>
              {showBreakdown ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showBreakdown && (
              <div className="px-3.5 pb-3 pt-1 text-xs space-y-2 border-t border-slate-800/80 text-slate-400">
                <div className="flex justify-between">
                  <span>Rules engine score:</span>
                  <span className="font-semibold text-slate-200">
                    {previewData?.rulesScore ?? 0} / 100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>AI classifier score:</span>
                  <span className="font-semibold text-slate-200">
                    {previewData?.llmAvailable && previewData.llmScore !== null
                      ? `${previewData.llmScore} / 100`
                      : "AI classifier unavailable, rules only"}
                  </span>
                </div>
                {previewData?.llmReason && (
                  <div className="text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-300">
                    <span className="font-medium text-slate-400">Reason: </span>
                    {previewData.llmReason}
                  </div>
                )}
                {previewData?.matchedRules && previewData.matchedRules.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Matched rules:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewData.matchedRules.map((r) => (
                        <span
                          key={r.id}
                          className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                        >
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Block Alert notice */}
          {decision === "block" && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">
                  Message Blocked by VeriShield
                </p>
                <p className="mt-0.5 text-rose-300/90 leading-relaxed">
                  This prompt was identified as a prompt-injection or jailbreak attempt. A
                  tamper-evident audit receipt has been logged.
                </p>
              </div>
            </div>
          )}

          {/* Warn notice */}
          {decision === "warn" && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">
                  Moderate Risk Warning
                </p>
                <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                  This message triggered elevated risk patterns. You can review it or confirm to send anyway.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Cancel
          </button>

          {decision === "allow" && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onApprove("none")}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Approve and send</span>
            </button>
          )}

          {decision === "warn" && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onApprove("warn_accepted")}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Send anyway</span>
            </button>
          )}

          {decision === "block" && !showOverrideConfirm && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowOverrideConfirm(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 transition"
            >
              Override block
            </button>
          )}

          {decision === "block" && showOverrideConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-300 font-medium">Are you sure?</span>
              <button
                type="button"
                onClick={() => onApprove("block_override")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/20"
              >
                Confirm override
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
