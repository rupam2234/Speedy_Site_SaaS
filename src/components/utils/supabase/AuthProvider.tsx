"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { browserClient } from "@/lib/db";

type Role = "user" | "admin" | "expert" | null;

type AuthContextType = {
  user: User | null;
  role: Role;
  roleLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, role: null, roleLoading: true });

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
    sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ role, ts: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

function clearRoleCache() {
  sessionStorage.removeItem(ROLE_CACHE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const cached = sessionStorage.getItem("supabase-user");
    if (cached) {
      const parsed = JSON.parse(cached);
      setUser(parsed);

      // Try to use cached role
      const roleCache = readRoleCache();
      if (roleCache) {
        setRole(roleCache.role);
        setRoleLoading(false);
      }
      return;
    }

    browserClient.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.log(error.message);
        setUser(null);
        setRoleLoading(false);
      } else {
        setUser(data.user);
        sessionStorage.setItem("supabase-user", JSON.stringify(data.user));
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setRoleLoading(false);
      clearRoleCache();
      return;
    }

    // If we already have a valid cached role, skip fetch
    const roleCache = readRoleCache();
    if (roleCache) {
      setRole(roleCache.role);
      setRoleLoading(false);
      return;
    }

    let cancelled = false;
    setRoleLoading(true);
    fetch("/api/user/role")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          const fetchedRole = json.role as Role;
          setRole(fetchedRole);
          writeRoleCache(fetchedRole);
          setRoleLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRole(null);
          setRoleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, role, roleLoading }}>{children}</AuthContext.Provider>
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
