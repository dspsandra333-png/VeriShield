import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Lock, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/chat";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Invalid email or password.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("demo@verishield.dev");
    setPassword("Demo@12345");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800/80 mb-3 text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back to VeriShield</h1>
          <p className="text-sm text-slate-400 mt-1">
            A personal privacy shield for AI chatbots, with proof of every decision it makes.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-semibold py-2.5 rounded-lg text-sm transition shadow-lg shadow-cyan-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign in</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Account Callout */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950 border border-cyan-900/40 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Demo Account
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                demo@verishield.dev &bull; Demo@12345
              </p>
            </div>
            <button
              type="button"
              onClick={fillDemoAccount}
              className="text-xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/70 px-2.5 py-1.5 rounded-lg transition"
            >
              Fill Demo
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            or{" "}
            <Link to="/register" className="text-cyan-400 hover:underline">
              create your own account in 10 seconds
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

