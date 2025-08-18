"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase_client } from "@/lib/db/browser_client";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthFlow = async () => {
      const code = searchParams.get("code");

      if (!code) {
        console.error("No code found in URL");
        router.replace("/sign-in?error=missing-code");
        return;
      }

      console.log(await supabase_client.auth.exchangeCodeForSession(code));

      // Get session to pull access_token
      const { data: sessionData, error: sessionError } =
        await supabase_client.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.error("Session retrieval failed:", sessionError);
        router.replace("/sign-in?error=session-missing");
        return;
      }

      const access_token = sessionData.session.access_token;

      try {
        const response = await fetch(
          "https://app-auth.thespeedysite.workers.dev",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result: any = await response.json();

        if (!response.ok) {
          router.replace(
            `/sign-in?error=${encodeURIComponent(
              result.message || "unauthorized"
            )}`
          );
          return;
        }

        router.replace("/dashboard");
      } catch (err) {
        console.error("Error calling auth worker:", err);
        router.replace("/sign-in?error=worker-failed");
      }
    };

    handleAuthFlow();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing you in...</p>
    </div>
  );
}
