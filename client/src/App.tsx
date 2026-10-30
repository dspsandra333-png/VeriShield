import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import { DemoProgressProvider } from "./context/DemoProgressContext.js";
import { NavBar } from "./components/NavBar.js";
import { WakeBanner } from "./components/WakeBanner.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { Chat } from "./pages/Chat.js";
import { Dashboard } from "./pages/Dashboard.js";
import { About } from "./pages/About.js";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoProgressProvider>
          <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
            <WakeBanner />
            <NavBar />
            <main className="flex-1">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/about" element={<About />} />
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="*" element={<Navigate to="/chat" replace />} />
              </Routes>
            </main>
          </div>
        </DemoProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

