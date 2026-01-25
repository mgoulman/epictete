"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { createSupabaseBrowserClient } from "./supabase-browser";
import type { AuthUser, PermissionName, RoleName, ProfileWithRole } from "@/lib/types/auth";
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
  const [supabase] = useState(() => createSupabaseBrowserClient());

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (ignore) return;

        if (authError || !authUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(`*, role:roles(*)`)
          .eq("id", authUser.id)
          .single();

        if (ignore) return;

        if (profileError || !profile) {
          console.error("Profile error:", profileError);
          setUser(null);
          setIsLoading(false);
          return;
        }

        const typedProfile = profile as ProfileWithRole;

        // Fetch permissions
        const { data: perms } = await supabase
          .from("role_permissions")
          .select(`permission:permissions(name)`)
          .eq("role_id", typedProfile.role_id);

        if (ignore) return;

        const permissionNames = (perms || [])
          .map((p: { permission: { name: string } | null }) => p.permission?.name)
          .filter(Boolean) as PermissionName[];

        setUser({
          id: authUser.id,
          email: authUser.email || "",
          full_name: typedProfile.full_name,
          avatar_url: typedProfile.avatar_url,
          role: (typedProfile.role?.name as RoleName) || "regular",
          permissions: permissionNames,
        });
        setIsLoading(false);
      } catch (err) {
        console.error("Auth init error:", err);
        if (!ignore) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (ignore) return;
        if (event === "SIGNED_OUT") {
          setUser(null);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Re-init on sign in
          init();
        }
      }
    );

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });

      if (err) {
        setError(err.message);
        setIsLoading(false);
        return { error: err.message };
      }

      if (!data.user) {
        setIsLoading(false);
        return { error: "No user returned" };
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`*, role:roles(*)`)
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Profile not found");
        setIsLoading(false);
        return { error: "Profile not found" };
      }

      const typedProfile = profile as ProfileWithRole;

      const { data: perms } = await supabase
        .from("role_permissions")
        .select(`permission:permissions(name)`)
        .eq("role_id", typedProfile.role_id);

      const permissionNames = (perms || [])
        .map((p: { permission: { name: string } | null }) => p.permission?.name)
        .filter(Boolean) as PermissionName[];

      setUser({
        id: data.user.id,
        email: data.user.email || "",
        full_name: typedProfile.full_name,
        avatar_url: typedProfile.avatar_url,
        role: (typedProfile.role?.name as RoleName) || "regular",
        permissions: permissionNames,
      });

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
    await supabase.auth.signOut();
    setUser(null);
  };

  const refresh = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(`*, role:roles(*)`)
      .eq("id", authUser.id)
      .single();

    if (!profile) {
      setUser(null);
      return;
    }

    const typedProfile = profile as ProfileWithRole;
    const { data: perms } = await supabase
      .from("role_permissions")
      .select(`permission:permissions(name)`)
      .eq("role_id", typedProfile.role_id);

    const permissionNames = (perms || [])
      .map((p: { permission: { name: string } | null }) => p.permission?.name)
      .filter(Boolean) as PermissionName[];

    setUser({
      id: authUser.id,
      email: authUser.email || "",
      full_name: typedProfile.full_name,
      avatar_url: typedProfile.avatar_url,
      role: (typedProfile.role?.name as RoleName) || "regular",
      permissions: permissionNames,
    });
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
