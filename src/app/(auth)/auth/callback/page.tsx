"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase_client } from "@/lib/db/browser_client";

export default function AuthCallbackClient() {
  const router = useRouter();

  useEffect(() => {
    handleAuthFlow();
  }, []);

  async function handleAuthFlow() {
    const {
      data: { session },
      error,
    } = await supabase_client.auth.getSession();

    if (error) {
      console.error("Failed to get session:", error);
      router.replace("/sign-in?error=session-missing");
      return;
    }

    if (!session) {
      console.error("No active session yet");
      router.replace("/sign-in?error=no-session");
      return;
    }

    const access_token = session.access_token;

    const response = await fetch("/api/account/auth", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    const result: any = await response.json();
    if (!response.ok) {
      router.replace(
        `/sign-in?error=${encodeURIComponent(result.message || "unauthorized")}`,
      );
      return;
    }

    // Cache subscription info for this session
    sessionStorage.setItem("subscriptionData", JSON.stringify(result));

    router.replace("/dashboard");
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing you in...</p>
    </div>
  );
}
