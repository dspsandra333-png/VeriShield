import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Layers,
  FileText,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { apiClient } from "../api/client.js";
import { StatCard } from "../components/StatCard.js";
import { ReceiptCard } from "../components/ReceiptCard.js";
import { ReceiptDrawer } from "../components/ReceiptDrawer.js";
import { VerifyPanel } from "../components/VerifyPanel.js";
import { EvalPanel } from "../components/EvalPanel.js";
import type {
  Receipt,
  StatsResponse,
  VerifyResponse,
} from "../types.js";

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalReceipts, setTotalReceipts] = useState(0);

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [tamperedSeq, setTamperedSeq] = useState<number | null>(null);

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get<StatsResponse>("/api/stats");
      setStats(res.data);
    } catch {
      // Handled
    }
  }, []);

  const fetchReceipts = useCallback(async () => {
    try {
      let url = `/api/receipts?limit=${pageSize}&offset=${page * pageSize}&order=desc`;
      if (actionFilter) {
        url += `&action=${actionFilter}`;
      }
      const res = await apiClient.get<{ receipts: Receipt[]; total: number }>(url);
      setReceipts(res.data.receipts);
      setTotalReceipts(res.data.total);
    } catch {
      // Handled
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchStats();
    fetchReceipts();

    // Auto-refresh stats every 10 seconds while tab is visible
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    }, 10_000);

    return () => clearInterval(timer);
  }, [fetchStats, fetchReceipts]);

  const handleVerificationDone = (resp: VerifyResponse) => {
    if (!resp.valid && resp.broken_at_seq !== null) {
      setTamperedSeq(resp.broken_at_seq);
    } else {
      setTamperedSeq(null);
    }
  };

  const handleRefreshAll = () => {
    fetchStats();
    fetchReceipts();
  };

  // Prepare chart data
  const chartData = stats
    ? [
        { name: "Allowed", count: stats.byAction.ALLOWED, color: "#10b981" },
        { name: "Redacted", count: stats.byAction.REDACTED, color: "#06b6d4" },
        { name: "Warned", count: stats.byAction.WARNED, color: "#f59e0b" },
        { name: "Blocked", count: stats.byAction.BLOCKED, color: "#f43f5e" },
        { name: "Overridden", count: stats.byAction.OVERRIDDEN, color: "#a855f7" },
        {
          name: "Output Intercept",
          count: (stats.byAction.OUTPUT_BLOCKED || 0) + (stats.byAction.OUTPUT_REDACTED || 0),
          color: "#e11d48",
        },
      ]
    : [];

  const outputCaughtTotal = stats
    ? (stats.byAction.OUTPUT_BLOCKED || 0) + (stats.byAction.OUTPUT_REDACTED || 0)
    : 0;

  const totalPages = Math.ceil(totalReceipts / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            VeriShield Dashboard
            <span className="text-xs bg-slate-800 text-cyan-400 border border-slate-700 px-2 py-0.5 rounded font-mono font-medium">
              Audit &amp; Intelligence
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry of personal data protected, attack interventions, and cryptographic chain proofs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2.5 py-1 rounded-full">
            PRIVACY
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-950 text-rose-400 border border-rose-800/80 px-2.5 py-1 rounded-full">
            SECURITY
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full">
            TRUST
          </span>
        </div>
      </div>

      {/* 8 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard
          label="Total"
          value={stats?.total ?? 0}
          icon={Layers}
          color="slate"
        />
        <StatCard
          label="Allowed"
          value={stats?.byAction.ALLOWED ?? 0}
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          label="Redacted"
          value={stats?.byAction.REDACTED ?? 0}
          icon={Lock}
          color="cyan"
        />
        <StatCard
          label="Warned"
          value={stats?.byAction.WARNED ?? 0}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          label="Blocked"
          value={stats?.byAction.BLOCKED ?? 0}
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          label="Overridden"
          value={stats?.byAction.OVERRIDDEN ?? 0}
          icon={AlertTriangle}
          color="purple"
        />
        <StatCard
          label="Output Caught"
          value={outputCaughtTotal}
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          label="Items Masked"
          value={stats?.itemsMasked ?? 0}
          icon={Lock}
          color="cyan"
        />
      </div>

      {/* Chart & How AI is Used */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Distribution Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-white uppercase tracking-wider block mb-3">
            Enforcement Decisions Breakdown
          </span>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  cursor={{ fill: "rgba(51, 65, 85, 0.2)" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* How AI Is Used Honest Transparency Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                How AI Is Used (Honest Disclosure)
              </span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                <span>
                  <strong>Personal-data detection:</strong> Regex + Luhn check + lightweight local gazetteer and cue phrase heuristics running offline in the browser. (Weaker than heavy NER models like Presidio).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                <span>
                  <strong>Prompt-injection detection:</strong> Weighted known-attack rules PLUS a Gemini classifier that ONLY ever evaluates already-masked sanitized text.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                <span>
                  <strong>Chat generation:</strong> Google Gemini API receiving strictly masked placeholders.
                </span>
              </li>
            </ul>
          </div>
          <p className="text-[10px] text-slate-500 pt-3 border-t border-slate-800 mt-2">
            VeriShield prioritizes client sovereignty and full transparency over black-box claims.
          </p>
        </div>
      </div>

      {/* Cryptographic Verification Panel (TRUST) */}
      <VerifyPanel
        demoMode={stats?.demoMode ?? true}
        onVerificationDone={handleVerificationDone}
        onRefreshReceipts={handleRefreshAll}
      />

      {/* Audit Receipts Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Audit Log Receipts Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hash-chained receipts recorded sequentially. Zero message or PII bodies are stored.
            </p>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Actions</option>
              <option value="ALLOWED">Allowed</option>
              <option value="REDACTED">Redacted</option>
              <option value="WARNED">Warned</option>
              <option value="BLOCKED">Blocked</option>
              <option value="OVERRIDDEN">Overridden</option>
              <option value="OUTPUT_BLOCKED">Output Blocked</option>
              <option value="OUTPUT_REDACTED">Output Redacted</option>
              <option value="AI_UNAVAILABLE">AI Unavailable</option>
            </select>
          </div>
        </div>

        {/* Receipts List */}
        <div className="space-y-2">
          {receipts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No audit receipts match the current filter.
            </div>
          ) : (
            receipts.map((r) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                onSelect={setSelectedReceipt}
                isTamperedTarget={tamperedSeq === r.seq}
              />
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalReceipts)} of{" "}
              {totalReceipts}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition text-slate-300"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((prev) => prev + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition text-slate-300"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Benchmark Suite */}
      <EvalPanel />

      {/* Drawer */}
      <ReceiptDrawer
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
