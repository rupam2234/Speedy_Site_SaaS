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

type AuthContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const cached = sessionStorage.getItem("supabase-user");
    if (cached) {
      setUser(JSON.parse(cached));
      return;
    }

    browserClient.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.log(error.message);
        setUser(null);
      } else {
        setUser(data.user);
        sessionStorage.setItem("supabase-user", JSON.stringify(data.user));
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
}

export function useSupabaseUser() {
  return useContext(AuthContext).user;
}
