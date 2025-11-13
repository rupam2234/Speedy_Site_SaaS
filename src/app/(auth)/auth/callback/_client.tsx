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
        router.replace("/sign-in?error=missing-code");
        return;
      }

      try {
        // Exchange code for session
        const { data: exchangeData, error: exchangeError } =
          await supabase_client.auth.exchangeCodeForSession(code);

        if (exchangeError || !exchangeData.session) {
          console.error("Session exchange failed:", exchangeError);
          router.replace("/sign-in?error=session-missing");
          return;
        }

        const access_token = exchangeData.session.access_token;

        // Check if we already have subscription info cached
        const cached = sessionStorage.getItem("subscriptionData");
        if (cached) {
          console.log("Using cached subscription:", cached);
          router.replace("/dashboard");
          return;
        }

        // Call the worker only if no cache
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

        // Cache subscription info for this session
        sessionStorage.setItem("subscriptionData", JSON.stringify(result));

        router.replace("/dashboard");
      } catch (err) {
        console.error("Error during auth flow:", err);
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
