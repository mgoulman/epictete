"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import type { AuthUser, PermissionName, RoleName } from "@/lib/types/auth";
import { hasPermission, hasAnyPermission, hasRole, isAdmin } from "./permissions";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const msg = data.error || "Sign in failed";
        setError(msg);
        setIsLoading(false);
        return { error: msg };
      }

      setUser(data.user);
      setIsLoading(false);
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
      setIsLoading(false);
      return { error: msg };
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const refresh = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function usePermissions() {
  const { user } = useAuth();
  return {
    hasPermission: (p: PermissionName) => hasPermission(user, p),
    hasAnyPermission: (ps: PermissionName[]) => hasAnyPermission(user, ps),
    hasRole: (r: RoleName) => hasRole(user, r),
    isAdmin: () => isAdmin(user),
    permissions: user?.permissions || [],
    role: user?.role || null,
  };
}
