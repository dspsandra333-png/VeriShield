import React, { useState, useEffect } from "react";
import { Play, Sparkles, RefreshCw, AlertCircle, BarChart3 } from "lucide-react";
import { apiClient, evalApiClient } from "../api/client.js";
import type { EvalResult } from "../types.js";

export const EvalPanel: React.FC = () => {
  const [runningRules, setRunningRules] = useState(false);
  const [runningHybrid, setRunningHybrid] = useState(false);
  const [hybridProgress, setHybridProgress] = useState<{ done: number; total: number } | null>(null);

  const [rulesResult, setRulesResult] = useState<EvalResult | null>(null);
  const [hybridResult, setHybridResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch latest saved benchmarks on mount
    apiClient
      .get<{ rules: EvalResult | null; hybrid: EvalResult | null }>("/api/eval/latest")
      .then((res) => {
        if (res.data.rules) setRulesResult(res.data.rules);
        if (res.data.hybrid) setHybridResult(res.data.hybrid);
      })
      .catch(() => {});
  }, []);

  const handleRunRules = async () => {
    setRunningRules(true);
    setError(null);
    try {
      const res = await apiClient.post<{ result: EvalResult }>("/api/eval/run", {
        mode: "rules",
      });
      setRulesResult(res.data.result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Rules evaluation failed.";
      setError(msg);
    } finally {
      setRunningRules(false);
    }
  };

  const handleRunHybrid = async () => {
    setRunningHybrid(true);
    setError(null);
    setHybridProgress(null);

    try {
      const res = await evalApiClient.post<{ jobId: string; total: number }>("/api/eval/run", {
        mode: "hybrid",
      });
      const jobId = res.data.jobId;
      setHybridProgress({ done: 0, total: res.data.total });

      // Poll status every 2 seconds
      const interval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get<{
            state: "running" | "done" | "error";
            done: number;
            total: number;
            result?: EvalResult;
          }>(`/api/eval/status?jobId=${jobId}`);

          setHybridProgress({ done: statusRes.data.done, total: statusRes.data.total });

          if (statusRes.data.state === "done" && statusRes.data.result) {
            clearInterval(interval);
            setHybridResult(statusRes.data.result);
            setRunningHybrid(false);
            setHybridProgress(null);
          } else if (statusRes.data.state === "error") {
            clearInterval(interval);
            setError("Hybrid benchmark encountered an error.");
            setRunningHybrid(false);
            setHybridProgress(null);
          }
        } catch {
          clearInterval(interval);
          setRunningHybrid(false);
          setHybridProgress(null);
        }
      }, 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Could not initiate hybrid evaluation.";
      setError(msg);
      setRunningHybrid(false);
    }
  };

  const renderResultCard = (title: string, result: EvalResult | null, isHybrid = false) => {
    if (!result) {
      return (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500 py-8">
          No benchmark run recorded yet for {title.toLowerCase()}. Click the button above to run.
        </div>
      );
    }

    return (
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-white text-sm">{title} Benchmark</span>
          <span className="text-[10px] text-slate-500 font-mono">
            {new Date(result.created_at).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Detection Rate
            </span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">
              {result.detection_rate}%
            </span>
            <span className="text-[10px] text-slate-500">
              {result.attack_detected} / {result.attack_total}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              False Alarms
            </span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block">
              {result.false_alarm_rate}%
            </span>
            <span className="text-[10px] text-slate-500">
              {result.false_alarms} / {result.normal_total}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              PII Recall
            </span>
            <span className="text-base font-bold text-cyan-400 mt-0.5 block">
              {result.pii_recall !== null ? `${result.pii_recall}%` : "N/A"}
            </span>
            <span className="text-[10px] text-slate-500">Known PII types</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              LLM Calls
            </span>
            <span className="text-base font-bold text-slate-200 mt-0.5 block">
              {isHybrid ? result.llm_calls_ok : "Rules only"}
            </span>
            <span className="text-[10px] text-slate-500">
              {isHybrid ? `${result.llm_calls_failed} failed` : "Offline"}
            </span>
          </div>
        </div>

        {/* Missed Attacks */}
        {result.missed && result.missed.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-rose-400 block mb-1">
              Missed Attacks ({result.missed.length}) — Honest Limits:
            </span>
            <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/80">
              {result.missed.map((m, idx) => (
                <div key={idx} className="text-[11px] text-slate-400 font-mono truncate">
                  &bull; "{m}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* False Alarms */}
        {result.false_alarm_items && result.false_alarm_items.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-amber-400 block mb-1">
              False Alarms ({result.false_alarm_items.length}):
            </span>
            <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/80">
              {result.false_alarm_items.map((f, idx) => (
                <div key={idx} className="text-[11px] text-slate-400 font-mono truncate">
                  &bull; "{f}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Security & Accuracy Evaluation Suite
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical benchmarks run directly against 40 varied attacks and 30 benign prompts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunRules}
            disabled={runningRules || runningHybrid}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition disabled:opacity-50"
          >
            {runningRules ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run Rules-Only Test</span>
          </button>

          <button
            onClick={handleRunHybrid}
            disabled={runningRules || runningHybrid}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 transition disabled:opacity-50"
          >
            {runningHybrid ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Run Hybrid Test</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Hybrid Progress Indicator */}
      {runningHybrid && hybridProgress && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex justify-between text-xs text-slate-300 mb-2">
            <span className="flex items-center gap-2 font-semibold">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              Running Sequential Gemini Hybrid Benchmark...
            </span>
            <span className="font-mono text-cyan-400">
              {hybridProgress.done} / {hybridProgress.total} prompts
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${Math.round((hybridProgress.done / hybridProgress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Calls are sequenced with 1200ms spacing to maintain strict provider quota limits.
          </p>
        </div>
      )}

      {/* Benchmark Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {renderResultCard("Rules-Only", rulesResult, false)}
        {renderResultCard("Hybrid (Rules + Gemini)", hybridResult, true)}
      </div>
    </div>
  );
};
