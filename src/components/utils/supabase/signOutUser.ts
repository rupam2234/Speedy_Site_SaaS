"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase_client } from "@/lib/db/browser_client";

interface SignOutOptions {
  redirectTo?: string;
}

export function useSignOut() {
  const router = useRouter();

  return useCallback(
    async ({ redirectTo }: SignOutOptions = {}) => {
      const { error } = await supabase_client.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
    },
    [router]
  );
}
