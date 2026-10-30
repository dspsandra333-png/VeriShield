import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, MessageSquare, LayoutDashboard, Info, LogOut, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";

export const NavBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: "/chat", label: "Chat", icon: MessageSquare },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/about", label: "About", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                VeriShield
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                  Privacy Shield
                </span>
              </span>
            </div>
          </Link>

          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-800 text-cyan-300"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                <Lock className="w-3 h-3 text-cyan-400" />
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

