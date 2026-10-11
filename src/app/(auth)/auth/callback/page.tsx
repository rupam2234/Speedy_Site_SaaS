"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/db";

export default function AuthCallbackClient() {
  const router = useRouter();

  useEffect(() => {
    handleAuthFlow();
  }, []);

  async function handleAuthFlow() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (!code) {
      router.replace("/sign-in?error=no-code");
      return;
    }

    const {
      data: { session },
      error,
    } = await browserClient.auth.exchangeCodeForSession(code);
    // const {
    //   data: { session },
    //   error,
    // } = await supabase_client.auth.getSession();

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

    window.history.replaceState({}, document.title, "/auth/callback"); // cleans the URL after exchange {code?= is not needed}

    // Session cookies were just set by exchangeCodeForSession — the API
    // route authenticates from cookies, no Bearer header needed.
    const response = await fetch("/api/account/auth", { method: "GET" });

    const result: any = await response.json();

    if (!response.ok) {
      router.replace(
        `/sign-in?error=${encodeURIComponent(result.message || "unauthorized")}`,
      );
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing you in...</p>
    </div>
  );
}
