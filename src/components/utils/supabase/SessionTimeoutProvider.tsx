"use client";

import { useEffect, useRef } from "react";
import { browserClient } from "@/lib/db";

// 2 hours of inactivity — any interaction resets the timer
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
const ACTIVITY_KEY = "ss-last-activity";
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
];

/**
 * Signs the user out after IDLE_TIMEOUT_MS without interaction.
 * - Activity is shared across tabs via localStorage, so one active tab
 *   keeps the session alive everywhere.
 * - Reloads do NOT reset the timer (the timestamp survives reloads), so
 *   returning to a tab left open past the timeout signs out immediately.
 */
export function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const armedRef = useRef(false);
  const lastActivityRef = useRef(0);

  useEffect(() => {
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const disarm = () => {
      armedRef.current = false;
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, recordActivity)
      );
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    };

    const handleExpired = async () => {
      disarm();
      try {
        // global scope also invalidates the refresh token server-side
        await browserClient.auth.signOut();
        sessionStorage.removeItem("supabase-user");
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith("user-plan:")) {
            sessionStorage.removeItem(key);
          }
        }
        localStorage.removeItem(ACTIVITY_KEY);
      } catch {
        // best-effort cleanup — sign-out + redirect below are what matter
        localStorage.removeItem(ACTIVITY_KEY);
      } finally {
        // Full reload clears every provider and cache
        window.location.replace("/sign-in?error=session-expired");
      }
    };

    const check = async () => {
      if (!armedRef.current) return;
      const stored = Number(localStorage.getItem(ACTIVITY_KEY) ?? 0);
      const lastActivity = Math.max(lastActivityRef.current, stored);
      if (lastActivity > 0 && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        await handleExpired();
        return;
      }
      // Share activity across tabs (throttled to this tick)
      if (lastActivityRef.current > stored) {
        localStorage.setItem(ACTIVITY_KEY, String(lastActivityRef.current));
      }
    };

    const arm = () => {
      if (armedRef.current) return;
      armedRef.current = true;
      // Seed from storage if present — a reload must not extend idle time
      const stored = Number(localStorage.getItem(ACTIVITY_KEY) ?? 0);
      lastActivityRef.current = stored > 0 ? stored : Date.now();
      if (stored <= 0) {
        localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      }
      ACTIVITY_EVENTS.forEach((event) =>
        window.addEventListener(event, recordActivity, { passive: true })
      );
      checkInterval = setInterval(check, CHECK_INTERVAL_MS);
    };

    const { data: authListener } = browserClient.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN") arm();
        if (event === "SIGNED_OUT") disarm();
      }
    );

    // Arm immediately if this page load already has a session
    browserClient.auth.getSession().then(({ data: { session } }) => {
      if (session) arm();
    });

    return () => {
      disarm();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
