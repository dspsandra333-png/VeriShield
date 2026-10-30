import React from "react";
import {
  Shield,
  Lock,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Cpu,
  Layers,
} from "lucide-react";

export const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Shield className="w-3.5 h-3.5" />
          Hackathon Theme: AI Security, Privacy &amp; Trust
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          About VeriShield
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          "A personal privacy shield for AI chatbots, with proof of every decision it makes."
        </p>
      </div>

      {/* The Problem */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          The Problem
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Every day, millions of developers, professionals, and everyday users paste confidential information into commercial AI assistants: API keys, database credentials, client emails, financial numbers, and personal identity documents. Commercial models record these interactions on remote servers, train on prompt contents (especially on free tiers), and remain vulnerable to direct and indirect prompt-injection attacks that can trick the model into executing hostile instructions or exfiltrating data.
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Existing enterprise guardrails are built for cloud providers to protect their own models, not to protect the person typing. Users lack visibility, control, and cryptographic proof of what leaves their machines.
        </p>
      </div>

      {/* Three Pillars: Security, Privacy, Trust */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Security */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-900">
              SECURITY
            </span>
            <h3 className="text-lg font-bold text-white mt-2 mb-2">
              Defense-in-Depth Injection Guard
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dual-layer screening: 11 weighted deterministic heuristic rules run independently of external models, combined with a specialized Gemini classifier evaluating sanitized data between isolated tags. Output shield blocks leaked canary tokens and withheld credentials.
            </p>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
              PRIVACY
            </span>
            <h3 className="text-lg font-bold text-white mt-2 mb-2">
              Browser-Side Zero-Knowledge Masking
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Personal data never leaves your browser unmasked. Sensitive items (emails, cards, Aadhaar, PAN, API keys, phones) are replaced with session tokens. The mapping lives exclusively in local React memory and is cleared on logout or page refresh.
            </p>
          </div>
        </div>

        {/* Trust */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-4">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
              TRUST
            </span>
            <h3 className="text-lg font-bold text-white mt-2 mb-2">
              Verifiable Cryptographic Audit Chain
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every decision generates a plain-language Trust Receipt recorded in a sequential SHA-256 hash chain. Verifiable on the backend or independently in the client browser using WebCrypto. Any retroactive modification breaks the chain immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Comparison With Existing Tools */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Honest Comparison With Existing Tools
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Prompt-injection detection and PII masking already exist in server-side tools (such as Llama Guard, NeMo Guardrails, and Microsoft Presidio). VeriShield’s key differences are:
        </p>
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Who controls it:</strong> Installed by the user to protect the person typing, not by the model provider to protect their cloud.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Where masking happens:</strong> On the user's device in local memory. Raw credentials and personal records never hit any backend network interface.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>User consent &amp; review:</strong> The user sees a visual preview of exactly what is hidden and can uncheck optional heuristic matches before approving transmission.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Auditable proof:</strong> Every decision has a plain-language receipt recorded in a tamper-evident cryptographic log verifiable right in the browser.
            </span>
          </li>
        </ul>
      </div>

      {/* Responsible-AI Principles */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          Responsible AI Commitments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">1. Data Minimization</strong>
            The server and third-party AI provider only ever receive sanitized placeholder tokens. No chat bodies or AI reply texts are persisted in our database.
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">2. Consent Before Transmission</strong>
            Every message is subject to interactive user review before leaving the device. Nothing is silently broadcast behind the user's back.
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">3. Human Override Option</strong>
            The human operator retains ultimate authority. If a message is flagged as a false-alarm block, the user can inspect the risk and explicitly override the decision.
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">4. Published False-Alarm Metrics</strong>
            We measure and publish our empirical false-positive rate (0% on benchmark normal prompts) and acknowledge our detection limits openly.
          </div>
        </div>
      </div>

      {/* Threat Model */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          Threat Model &amp; Security Boundaries
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/60 rounded-xl text-emerald-300 space-y-2">
            <strong className="text-emerald-400 text-sm block">What VeriShield Defends:</strong>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Accidental PII and API credential leakage to AI providers</li>
              <li>Direct and indirect prompt injection attempts</li>
              <li>System prompt and canary token extraction attacks</li>
              <li>Secret and credential leakage in model outputs</li>
              <li>Silent database record tampering and record deletion</li>
            </ul>
          </div>

          <div className="p-4 bg-rose-950/20 border border-rose-900/60 rounded-xl text-rose-300 space-y-2">
            <strong className="text-rose-400 text-sm block">What VeriShield Does NOT Defend:</strong>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>A fundamentally compromised client machine or keylogger malware</li>
              <li>Data the user explicitly unticks to send unmasked</li>
              <li>Novel zero-day adversarial jailbreaks that bypass both rules and AI</li>
              <li>A fully malicious server operator who rebuilds the entire hash chain from genesis (mitigated by anchoring and independent browser verification)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Honest Limitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-3 text-xs text-slate-400 leading-relaxed">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Honest Limitations Disclosure
        </h3>
        <p>
          Detection is not 100% accurate. Name detection relies on a local gazetteer and cue phrase heuristics and can miss uncommon names. The Gemini classifier can itself theoretically be manipulated by novel adversarial prompt phrasing (which is why deterministic rules run independently). On free model tiers, providers may use prompts to train future models, which reinforces why browser-side masking is crucial.
        </p>
        <p>
          The cryptographic hash chain is <em>tamper-evident</em>, not <em>tamper-proof</em>: an attacker who possesses full database access and code execution could mathematically re-hash a modified chain. VeriShield addresses this through the head anchor mechanism and independent browser verification. Demo tamper and reset capabilities are provided exclusively for evaluation and testing.
        </p>
      </div>
    </div>
  );
};
