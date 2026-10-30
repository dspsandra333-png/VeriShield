import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  Anchor,
  RefreshCw,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { apiClient } from "../api/client.js";
import { verifyReceiptChainInBrowser } from "../shield/chainVerify.js";
import { useDemoProgress } from "../context/DemoProgressContext.js";
import type { Receipt, VerifyResponse } from "../types.js";

interface VerifyPanelProps {
  demoMode: boolean;
  onVerificationDone: (response: VerifyResponse) => void;
  onRefreshReceipts: () => void;
}

export const VerifyPanel: React.FC<VerifyPanelProps> = ({
  demoMode,
  onVerificationDone,
  onRefreshReceipts,
}) => {
  const [serverVerifying, setServerVerifying] = useState(false);
  const [serverResult, setServerResult] = useState<VerifyResponse | null>(null);

  const [browserVerifying, setBrowserVerifying] = useState(false);
  const [browserResult, setBrowserResult] = useState<VerifyResponse | null>(null);

  const [tampering, setTampering] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [copiedHash, setCopiedHash] = useState(false);
  const [anchorStatus, setAnchorStatus] = useState<string | null>(null);

  const { markStep, hasTampered, setHasTampered } = useDemoProgress();

  // Read saved anchor from localStorage.vs_anchor
  const getAnchor = (): { seq: number; hash: string } | null => {
    try {
      const item = localStorage.getItem("vs_anchor");
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const handleServerVerify = async () => {
    setServerVerifying(true);
    try {
      const anchor = getAnchor();
      let url = "/api/verify";
      if (anchor) {
        url += `?anchorSeq=${anchor.seq}&anchorHash=${encodeURIComponent(anchor.hash)}`;
      }
      const res = await apiClient.get<VerifyResponse>(url);
      setServerResult(res.data);
      onVerificationDone(res.data);

      if (res.data.valid) {
        if (hasTampered) {
          markStep("restoredPassed");
        } else {
          markStep("verifyPassed");
        }
      } else {
        if (hasTampered) {
          markStep("tamperDetected");
        }
      }
    } catch {
      // Handled
    } finally {
      setServerVerifying(false);
    }
  };

  const handleBrowserVerify = async () => {
    setBrowserVerifying(true);
    try {
      // Loop and fetch all receipts ascending
      const allReceipts: Receipt[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await apiClient.get<{ receipts: Receipt[]; total: number }>(
          `/api/receipts?order=asc&limit=100&offset=${offset}`
        );
        const chunk = res.data.receipts || [];
        allReceipts.push(...chunk);
        if (chunk.length < 100 || allReceipts.length >= res.data.total) {
          hasMore = false;
        } else {
          offset += 100;
        }
      }

      const anchor = getAnchor();
      const result = await verifyReceiptChainInBrowser(allReceipts, anchor);
      setBrowserResult(result);
      onVerificationDone(result);

      if (result.valid) {
        if (hasTampered) {
          markStep("restoredPassed");
        } else {
          markStep("verifyPassed");
        }
      } else {
        if (hasTampered) {
          markStep("tamperDetected");
        }
      }
    } catch {
      // Handled
    } finally {
      setBrowserVerifying(false);
    }
  };

  const handleAnchorHead = () => {
    const headHash = serverResult?.head_hash || browserResult?.head_hash;
    const headSeq = serverResult?.head_seq || browserResult?.head_seq;
    if (headHash && headSeq) {
      localStorage.setItem("vs_anchor", JSON.stringify({ seq: headSeq, hash: headHash }));
      setAnchorStatus(`Anchored seq #${headSeq}`);
      setTimeout(() => setAnchorStatus(null), 3000);
    }
  };

  const handleExportJson = async () => {
    try {
      const allReceipts: Receipt[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await apiClient.get<{ receipts: Receipt[]; total: number }>(
          `/api/receipts?order=asc&limit=100&offset=${offset}`
        );
        const chunk = res.data.receipts || [];
        allReceipts.push(...chunk);
        if (chunk.length < 100 || allReceipts.length >= res.data.total) {
          hasMore = false;
        } else {
          offset += 100;
        }
      }

      const blob = new Blob([JSON.stringify(allReceipts, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verishield-audit-receipts-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Handled
    }
  };

  const handleTamper = async () => {
    setTampering(true);
    try {
      await apiClient.post("/api/demo/tamper", {});
      setHasTampered(true);
      onRefreshReceipts();
      // Auto run verify to immediately show the failure
      setTimeout(handleServerVerify, 500);
    } catch {
      // Handled
    } finally {
      setTampering(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await apiClient.post("/api/demo/restore", {});
      onRefreshReceipts();
      // Auto run verify to immediately show the pass
      setTimeout(handleServerVerify, 500);
    } catch {
      // Handled
    } finally {
      setRestoring(false);
    }
  };

  const handleResetLog = async () => {
    setResetting(true);
    try {
      await apiClient.post("/api/demo/reset", {});
      setHasTampered(false);
      onRefreshReceipts();
      setTimeout(handleServerVerify, 500);
    } catch {
      // Handled
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Cryptographic Chain Verification
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded">
              TRUST
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verify sequential SHA-256 hash chaining to prove zero unauthorized record alteration or deletion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            title="Download full audit log as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Receipts</span>
          </button>
        </div>
      </div>

      {/* Main Verification Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Server Verification Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">
              1. Server-Side Verification
            </span>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Verifies the entire sequence in PostgreSQL using contiguous index checks and SHA-256 entry recalculations.
            </p>
          </div>
          <button
            onClick={handleServerVerify}
            disabled={serverVerifying}
            className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/10 disabled:opacity-50"
          >
            {serverVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>Verify Log (Server)</span>
          </button>
        </div>

        {/* Independent Browser Verification Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">
              2. Independent Browser Verification (Trust Extra)
            </span>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Downloads the raw ledger and verifies each cryptographic block directly on your CPU via browser WebCrypto.
            </p>
          </div>
          <button
            onClick={handleBrowserVerify}
            disabled={browserVerifying}
            className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/80 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {browserVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400" />
            )}
            <span>Verify in Browser (Independent)</span>
          </button>
        </div>
      </div>

      {/* Verification Results Banner */}
      {serverResult && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${
            serverResult.valid
              ? "bg-emerald-950/40 border-emerald-800/70 text-emerald-300"
              : "bg-rose-950/40 border-rose-800/70 text-rose-300"
          }`}
        >
          {serverResult.valid ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm tracking-tight uppercase">
                {serverResult.valid ? "PASS: Integrity Intact" : "FAIL: Tampering Detected"}
              </span>
              <span className="text-[11px] font-mono">
                {serverResult.checked} entries verified
              </span>
            </div>
            {serverResult.valid ? (
              <p className="mt-1 text-emerald-300/90 leading-relaxed">
                All receipts form an unbroken cryptographic chain. Every entry hash matches its payload and parent block.
              </p>
            ) : (
              <p className="mt-1 text-rose-300/90 leading-relaxed font-semibold">
                Broken at sequence #{serverResult.broken_at_seq}: {serverResult.reason}
              </p>
            )}
          </div>
        </div>
      )}

      {browserResult && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-3 p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            browserResult.valid
              ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
              : "bg-rose-950/30 border-rose-800/60 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Browser Check:</strong>{" "}
              {browserResult.valid
                ? `Passed (${browserResult.checked} checked). Your browser verified the chain itself; you did not have to trust our server.`
                : `Failed at seq #${browserResult.broken_at_seq}: ${browserResult.reason}`}
            </span>
          </div>
        </div>
      )}

      {/* Head Hash & Anchoring */}
      {(serverResult?.head_hash || browserResult?.head_hash) && (
        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400 shrink-0">Chain Head:</span>
            <span className="font-mono text-cyan-300 text-[11px] truncate max-w-xs sm:max-w-md">
              {serverResult?.head_hash || browserResult?.head_hash}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const hash = serverResult?.head_hash || browserResult?.head_hash || "";
                navigator.clipboard.writeText(hash);
                setCopiedHash(true);
                setTimeout(() => setCopiedHash(false), 2000);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedHash ? "Copied" : "Copy"}</span>
            </button>

            <button
              onClick={handleAnchorHead}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] flex items-center gap-1 border border-slate-700 transition"
              title="Saves head hash in local browser storage to detect silently deleted latest records"
            >
              <Anchor className="w-3 h-3 text-cyan-400" />
              <span>{anchorStatus || "Anchor head"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Demo Actions (Only visible when server is in DEMO_MODE) */}
      {demoMode && (
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Demo Testing Controls
            </span>
            <span className="text-[10px] text-slate-500">
              Simulate tampering or reset test receipts
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={tampering}
              onClick={handleTamper}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-semibold transition"
            >
              {tampering ? "Tampering..." : "Demo: tamper with entry"}
            </button>

            <button
              type="button"
              disabled={restoring}
              onClick={handleRestore}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              {restoring ? "Restoring..." : "Demo: restore entry"}
            </button>

            <button
              type="button"
              disabled={resetting}
              onClick={handleResetLog}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/70 text-xs font-semibold transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetting ? "Resetting..." : "Demo: reset my log"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Hint: You can also edit an explanation directly in the Supabase Table Editor; verification will instantly pinpoint the altered row.
          </p>
        </div>
      )}
    </div>
  );
};

