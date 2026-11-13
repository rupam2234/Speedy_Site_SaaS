"use client";

import { useSyncExternalStore } from "react";
import AppSidebar from "./AppSidebar";
import PublicSidebar from "./PublicSidebar";
import { getCachedUserSync } from "@/components/utils/supabase/AuthProvider";

/**
 * Subscribe to auth state changes for useSyncExternalStore
 */
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);
  window.addEventListener("auth-cache-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
    window.removeEventListener("auth-cache-updated", callback);
  };
}

/**
 * Get snapshot of cached user for useSyncExternalStore
 */
function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return !!getCachedUserSync();
}

/**
 * Get server snapshot (always false for SSR)
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * SidebarSwitcher - instantly renders the correct sidebar based on cached auth state.
 * Uses useSyncExternalStore to re-render when cache changes (cross-tab, focus, or auth updates).
 * No flash, no skeleton, no loading state.
 */
export default function SidebarSwitcher() {
  const hasUser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return hasUser ? <AppSidebar /> : <PublicSidebar />;
}