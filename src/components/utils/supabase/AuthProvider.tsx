"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { browserClient } from "@/lib/db";
import type { OrderData } from "@/app/api/helpers/dataTypes";

type Role = "user" | "admin" | "expert" | null;

type AuthContextType = {
  user: User | null;
  role: Role;
  roleLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roleLoading: true,
});

const ROLE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ROLE_CACHE_KEY = "supabase-user-role";

function readRoleCache(): { role: Role; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts < ROLE_TTL_MS) {
      return { role: parsed.role as Role, ts: parsed.ts };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function writeRoleCache(role: Role) {
  try {
    sessionStorage.setItem(
      ROLE_CACHE_KEY,
      JSON.stringify({ role, ts: Date.now() }),
    );
    // Notify SidebarSwitcher in same tab
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth-cache-updated"));
    }
  } catch {
    // ignore quota errors
  }
}

// Synchronous orders reader - reads from sessionStorage BEFORE React renders
export function getCachedOrdersSync(): OrderData[] | null {
  if (typeof window === "undefined") return null;
  try {
    const cachedOrders = sessionStorage.getItem("orders");
    const cachedTime = sessionStorage.getItem("orders-ts");
    if (!cachedOrders || !cachedTime) return null;
    const now = Date.now();
    if (now - parseInt(cachedTime) >= 5 * 60 * 1000) return null; // 5 min TTL
    return JSON.parse(cachedOrders);
  } catch {
    return null;
  }
}

export function getCachedSelectedSiteSync(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("selected-site") ?? "";
}

function clearRoleCache() {
  sessionStorage.removeItem(ROLE_CACHE_KEY);
}

/**
 * Synchronous role reader - reads from sessionStorage BEFORE React renders.
 * This enables instant sidebar rendering without flash/skeleton.
 * Must be called at module level (outside component) or in a useSyncExternalStore.
 */
export function getCachedRoleSync(): Role {
  if (typeof window === "undefined") return null;
  const cached = readRoleCache();
  return cached?.role ?? null;
}

/**
 * Synchronous user reader - reads from sessionStorage BEFORE React renders.
 */
export function getCachedUserSync(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("supabase-user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const roleFetchedForUser = useRef<string | null>(null); // Track which user we fetched role for

  // Read cached user/role immediately after hydration (before paint) - no hydration mismatch
  useLayoutEffect(() => {
    const cachedUser = getCachedUserSync();
    const cachedRole = getCachedRoleSync();

    // ALWAYS set user from cache immediately if available
    if (cachedUser) {
      setUser(cachedUser);
      // Only the USER is cached here — never mark the role as fetched. That
      // made verifyAuth() below early-return ("Role already fetched") and
      // skip the role fetch entirely, leaving role = null for the session.
    }

    // If we have a valid cached role, use it immediately
    if (cachedRole !== null) {
      setRole(cachedRole);
      setRoleLoading(false);
      if (cachedUser) {
        roleFetchedForUser.current = cachedUser.id;
      }
      // Don't verify auth in background - cache is valid for 5 min
      return;
    }

    // No valid cached role - verify auth and fetch role
    verifyAuth();
  }, []);

  // Listen for auth state changes to keep in sync across tabs
  useEffect(() => {
    const { data: authListener } = browserClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log(
          "[AuthProvider] Auth state change:",
          event,
          session?.user?.id,
        );
        if (event === "SIGNED_OUT") {
          // Clear auth state immediately on sign out
          console.log("[AuthProvider] SIGNED_OUT - clearing auth");
          setUser(null);
          setRole(null);
          setRoleLoading(false);
          clearRoleCache();
          sessionStorage.removeItem("supabase-user");
          window.dispatchEvent(new Event("auth-cache-updated"));
          roleFetchedForUser.current = null;
        } else if (event === "SIGNED_IN") {
          // Verify auth only on sign in (not on token refresh)
          if (session?.user) {
            console.log("[AuthProvider] SIGNED_IN - calling verifyAuth");
            verifyAuth();
          }
        }
        // TOKEN_REFRESHED fires frequently - don't re-verify role
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function verifyAuth() {
    try {
      const { data, error } = await browserClient.auth.getUser();

      if (error) {
        setUser(null);
        setRole(null);
        setRoleLoading(false);
        clearRoleCache();
        sessionStorage.removeItem("supabase-user");
        window.dispatchEvent(new Event("auth-cache-updated"));
        return;
      }

      const freshUser = data.user;

      if (!freshUser) {
        // No user - clear everything
        console.log("[AuthProvider] No freshUser, clearing");
        setUser(null);
        setRole(null);
        setRoleLoading(false);
        clearRoleCache();
        sessionStorage.removeItem("supabase-user");
        window.dispatchEvent(new Event("auth-cache-updated"));
        return;
      }

      // User exists - update cache
      setUser(freshUser);
      sessionStorage.setItem("supabase-user", JSON.stringify(freshUser));
      window.dispatchEvent(new Event("auth-cache-updated"));

      // Check if we already fetched role for this user
      if (roleFetchedForUser.current === freshUser.id) {
        setRoleLoading(false);
        return; // Already done
      }

      // Check role cache — a cached NULL role means "never resolved" (the old
      // API returned null for users whose profiles.role was unset). Since
      // /api/user/role now defaults missing roles to "user", treat a null
      // cache entry as a miss and re-fetch instead of trusting it.
      const roleCache = readRoleCache();
      if (roleCache && roleCache.role !== null) {
        console.log(
          "[AuthProvider] Setting role from roleCache:",
          roleCache.role,
        );
        setRole(roleCache.role);
        setRoleLoading(false);
        roleFetchedForUser.current = freshUser.id;
        return;
      }

      // Fetch role from API
      setRoleLoading(true);
      const res = await fetch("/api/user/role", {
        credentials: "include",
      });
      const json = await res.json();
      // Unresolved role must not mean "no badge": every account without an
      // explicit admin/expert role is a customer, matching the API default.
      const fetchedRole = (json.role as Role) ?? "user";

      setRole(fetchedRole);
      // Never cache an unresolved role, so the next load retries the fetch.
      if (fetchedRole !== null) {
        writeRoleCache(fetchedRole);
      }
      setRoleLoading(false);
      roleFetchedForUser.current = freshUser.id;
    } catch (err) {
      setUser(null);
      setRole(null);
      setRoleLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, roleLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseUser() {
  return useContext(AuthContext).user;
}

export function useUserRole() {
  return useContext(AuthContext).role;
}

export function useUserRoleLoading() {
  return useContext(AuthContext).roleLoading;
}
