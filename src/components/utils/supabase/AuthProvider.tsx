"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase_client } from "@/lib/db/browser_client";

type AuthContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase_client.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("Supabase user fetch error:", error.message);
        setUser(null);
      } else {
        setUser(data.user);
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
