"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/db";

interface SignOutOptions {
  redirectTo?: string;
}

export function useSignOut() {
  const router = useRouter();

  const signOut = useCallback(
    async ({ redirectTo }: SignOutOptions = {}) => {
      const { error } = await browserClient.auth.signOut();

      if (error) {
        console.error(error.message ?? "Supabase sign out error");
        return;
      }

      sessionStorage.clear();
      localStorage.clear();

      router.push(redirectTo ?? "/sign-in");
    },
    [router],
  );

  return signOut;
}
