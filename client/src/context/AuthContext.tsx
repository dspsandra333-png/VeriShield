import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiClient, authStorage } from "../api/client.js";
import type { AuthResponse, AuthUser } from "../types.js";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<{ user: AuthUser }>("/api/auth/me");
      setUser(res.data.user);
    } catch {
      authStorage.clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleLogoutEvent = () => {
      setUser(null);
    };

    window.addEventListener("verishield:logout", handleLogoutEvent);
    return () => {
      window.removeEventListener("verishield:logout", handleLogoutEvent);
    };
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post<AuthResponse>("/api/auth/login", { email, password });
    authStorage.setAuth(res.data);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiClient.post<AuthResponse>("/api/auth/register", { name, email, password });
    authStorage.setAuth(res.data);
    setUser(res.data.user);
  };

  const logout = () => {
    authStorage.clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

