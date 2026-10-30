import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  FileText,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { apiClient } from "../api/client.js";
import { mask, createSessionPlaceholderMap, SessionPlaceholderMap } from "../shield/mask.js";
import { restore } from "../shield/restore.js";
import { ShieldPreview } from "../components/ShieldPreview.js";
import { ReceiptDrawer } from "../components/ReceiptDrawer.js";
import { RiskGauge } from "../components/RiskGauge.js";
import { DemoKit } from "../components/DemoKit.js";
import { DemoChecklist } from "../components/DemoChecklist.js";
import { useDemoProgress } from "../context/DemoProgressContext.js";
import type {
  ChatResponse,
  ConfirmMode,
  DetectedItem,
  PreviewResponse,
  Receipt,
  SimulateLeak,
} from "../types.js";

interface MessageItem {
  id: string;
  role: "user" | "model";
  displayText: string;
  maskedText: string;
  model?: string;
  maskedCount?: number;
  receipt?: Receipt | null;
  outputAction?: "clean" | "blocked" | "redacted";
  showRaw?: boolean;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [currentRawDraft, setCurrentRawDraft] = useState("");
  const [currentMaskedDraft, setCurrentMaskedDraft] = useState("");
  const [currentDetectedItems, setCurrentDetectedItems] = useState<DetectedItem[]>([]);
  const [skippedPlaceholders, setSkippedPlaceholders] = useState<Set<string>>(new Set());

  // Receipt Drawer
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Demo Kit simulation state
  const [simulateLeak, setSimulateLeak] = useState<SimulateLeak>("none");
  const [demoMode, setDemoMode] = useState(true);

  // Live Shield side panel metrics
  const [lastRiskScore, setLastRiskScore] = useState<number | null>(null);
  const [lastDecision, setLastDecision] = useState<"allow" | "warn" | "block" | null>(null);
  const [totalSessionMasked, setTotalSessionMasked] = useState(0);

  // Session placeholder map strictly in React memory (Rule P2)
  const sessionMapRef = useRef<SessionPlaceholderMap>(createSessionPlaceholderMap());

  const { markStep } = useDemoProgress();

  useEffect(() => {
    // Check demoMode from health endpoint
    apiClient
      .get<{ demoMode: boolean }>("/api/health")
      .then((res) => {
        setDemoMode(res.data.demoMode ?? true);
      })
      .catch(() => {});
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    sessionMapRef.current = createSessionPlaceholderMap();
    setLastRiskScore(null);
    setLastDecision(null);
    setTotalSessionMasked(0);
    setError(null);
  };

  const handleStartReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setCurrentRawDraft(text);
    const initialSkipped = new Set<string>();
    setSkippedPlaceholders(initialSkipped);

    // 1. Mask on device
    const { maskedText, items } = mask(text, sessionMapRef.current, {
      skippedPlaceholders: initialSkipped,
    });
    setCurrentMaskedDraft(maskedText);
    setCurrentDetectedItems(items);
    setPreviewOpen(true);
    setPreviewLoading(true);

    try {
      // 2. Send only masked text to preview
      const res = await apiClient.post<PreviewResponse>("/api/preview", {
        maskedMessage: maskedText,
      });
      setPreviewData(res.data);
      setLastRiskScore(res.data.risk_score);
      setLastDecision(res.data.decision);

      if (res.data.decision === "block") {
        markStep("attackBlocked");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to run security preview.";
      setError(msg);
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Live re-mask when optional items are toggled (debounced)
  const handleToggleItem = (placeholder: string) => {
    const nextSkipped = new Set(skippedPlaceholders);
    if (nextSkipped.has(placeholder)) {
      nextSkipped.delete(placeholder);
    } else {
      nextSkipped.add(placeholder);
    }
    setSkippedPlaceholders(nextSkipped);

    const { maskedText, items } = mask(currentRawDraft, sessionMapRef.current, {
      skippedPlaceholders: nextSkipped,
    });
    setCurrentMaskedDraft(maskedText);
    setCurrentDetectedItems(items);

    setPreviewLoading(true);
    apiClient
      .post<PreviewResponse>("/api/preview", {
        maskedMessage: maskedText,
      })
      .then((res) => {
        setPreviewData(res.data);
        setLastRiskScore(res.data.risk_score);
        setLastDecision(res.data.decision);
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  };

  const handleApproveAndSend = async (confirmMode: ConfirmMode) => {
    setPreviewOpen(false);
    setLoading(true);
    setInput("");

    const activeMaskedCount = currentDetectedItems.filter(
      (i) => !skippedPlaceholders.has(i.placeholder)
    ).length;

    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      displayText: currentRawDraft,
      maskedText: currentMaskedDraft,
      maskedCount: activeMaskedCount,
    };

    setMessages((prev) => [...prev, userMessage]);
    setTotalSessionMasked((prev) => prev + activeMaskedCount);

    try {
      // Build history of masked text
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.maskedText,
      }));

      const res = await apiClient.post<ChatResponse>("/api/chat", {
        maskedMessage: currentMaskedDraft,
        history: historyPayload,
        confirm: confirmMode,
        simulateLeak,
      });

      // Reset simulateLeak after send
      if (simulateLeak !== "none") {
        setSimulateLeak("none");
      }

      if (res.status === 403) {
        // Blocked at chat stage
        setError("Message was blocked by the VeriShield security engine.");
        markStep("attackBlocked");
        return;
      }

      if (res.status === 409) {
        setError("Message required confirmation.");
        return;
      }

      const chatData = res.data;
      setLastRiskScore(chatData.risk_score);
      setLastDecision(chatData.decision);

      // Track progress
      if (chatData.inputReceipt?.action === "ALLOWED") {
        markStep("allowedSent");
      } else if (chatData.inputReceipt?.action === "REDACTED") {
        markStep("redactedSent");
      }

      if (chatData.outputReceipt) {
        markStep("outputCaught");
      }

      // Restore AI reply locally using session map (Rule P1, P2)
      const restoredReply = restore(chatData.reply, sessionMapRef.current);

      const aiMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        displayText: restoredReply,
        maskedText: chatData.reply,
        model: chatData.model,
        receipt: chatData.outputReceipt || chatData.inputReceipt,
        outputAction: chatData.outputAction,
        showRaw: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to receive response from assistant.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleRawView = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, showRaw: !m.showRaw } : m))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Stream (3 cols) */}
        <div className="lg:col-span-3 flex flex-col h-[calc(100vh-8rem)] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Top Chat Bar */}
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center gap-2">
                  Protected Session
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                    PRIVACY ACTIVE
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Data masked in browser &bull; Zero raw message storage on server
                </p>
              </div>
            </div>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              title="Clears messages and local memory placeholder map"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New chat</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/40 border-b border-red-800/60 text-red-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
                Dismiss
              </button>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 mb-3 shadow-inner">
                  <Shield className="w-7 h-7 text-cyan-500/70" />
                </div>
                <h3 className="text-base font-bold text-slate-300">
                  VeriShield Privacy Protection is Ready
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                  Messages typed here are automatically scanned for PII and secrets on your device before transmission. Use the demo prompts on the right to test attack blocks and data redaction.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-cyan-600 text-white rounded-br-none shadow-md shadow-cyan-600/10"
                        : "bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {/* Intercepted Output Notice */}
                    {m.outputAction === "blocked" && (
                      <div className="mb-2.5 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Output Shield withheld response (Canary / Secret Leak caught).</span>
                      </div>
                    )}
                    {m.outputAction === "redacted" && (
                      <div className="mb-2.5 p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-[11px] flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Output Shield replaced unmasked assistant PII with [REDACTED_*].</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans">
                      {m.showRaw ? m.maskedText : m.displayText}
                    </div>

                    {/* Footer chips inside bubble */}
                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-2">
                        {m.maskedCount !== undefined && m.maskedCount > 0 && (
                          <span className="bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded font-medium">
                            {m.maskedCount} item{m.maskedCount === 1 ? "" : "s"} hidden
                          </span>
                        )}
                        {m.model && (
                          <span className="text-slate-500 font-mono">
                            {m.model}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Raw / Restored View Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleRawView(m.id)}
                          className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 underline"
                        >
                          {m.showRaw ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Show restored</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>See what AI saw</span>
                            </>
                          )}
                        </button>

                        {/* View Receipt Button */}
                        {m.receipt && (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(m.receipt || null)}
                            className="bg-slate-900 hover:bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700 font-semibold flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Receipt #{m.receipt.seq}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl w-fit">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>VeriShield processing with Gemini...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleStartReview} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message (personal data will be detected and hidden)..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center shadow-lg shadow-cyan-500/10"
              title="Review & Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Live Shield Side Panel & Demo Tools (1 col) */}
        <div className="space-y-4">
          {/* Live Shield Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Live Shield
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                SECURITY
              </span>
            </div>

            {/* Last Risk Gauge */}
            {lastRiskScore !== null && (
              <RiskGauge score={lastRiskScore} decision={lastDecision || undefined} />
            )}

            {/* Shield Pipeline Stages */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">1. Input Shield</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle className="w-3 h-3" /> Active (Browser)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">2. Attack Detector</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle className="w-3 h-3" /> Active (Rules+AI)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">3. Output Shield</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle className="w-3 h-3" /> Active (Canary)
                </span>
              </div>
            </div>

            {/* Session Stats */}
            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
              <span>Session Hidden Items:</span>
              <span className="font-bold text-cyan-400">{totalSessionMasked}</span>
            </div>

            {/* Privacy Notice */}
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Chats live only in this tab's memory. Refreshing clears them; your receipts stay in the log.
            </p>
          </div>

          {/* Demo Kit 1-Click Prompts */}
          <DemoKit
            onFillPrompt={(text) => setInput(text)}
            simulateLeak={simulateLeak}
            onSetSimulateLeak={setSimulateLeak}
            demoMode={demoMode}
          />

          {/* Demo 7-Step Progress Checklist */}
          <DemoChecklist />
        </div>
      </div>

      {/* Review Modal */}
      {previewOpen && (
        <ShieldPreview
          originalText={currentRawDraft}
          maskedText={currentMaskedDraft}
          items={currentDetectedItems}
          previewData={previewData}
          loading={previewLoading}
          skippedPlaceholders={skippedPlaceholders}
          onToggleItem={handleToggleItem}
          onCancel={() => setPreviewOpen(false)}
          onApprove={handleApproveAndSend}
        />
      )}

      {/* Trust Receipt Drawer */}
      <ReceiptDrawer
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
