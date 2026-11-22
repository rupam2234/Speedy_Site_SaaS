"use client";

import { Bell, Check, Circle, Loader2 } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import {
  useSupabaseUser,
  useUserRole,
  useUserRoleLoading,
} from "../utils/supabase/AuthProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { cachedData, cleanExpiredCache } from "../utils";
import { createPortal } from "react-dom";
import { Notifications } from "@/app/api";
import { CustomTooltip } from "../theme";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

// Connection status types (matching the API)
type ConnectionStatusType =
  | "unknown"
  | "pending"
  | "connected"
  | "verified"
  | "expired"
  | "error";

interface ConnectionStatus {
  status: ConnectionStatusType;
  message: string;
  details: {
    pluginInstalled: boolean;
    hasSecret: boolean;
    hasSignature: boolean;
    signatureExpired: boolean;
    hmacVerifiedAt: string | null;
    rumAssignedAt: string | null;
    entitled: boolean;
    hmacExpiresAt: string | null;
  };
  checkedAt: number;
}

// Cache helpers — 30 days in localStorage
const CONNECTION_CACHE_PREFIX = "wp-connection-status-";
const CONNECTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCachedConnectionStatus(domain: string): ConnectionStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CONNECTION_CACHE_PREFIX}${domain}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.checkedAt < CONNECTION_TTL_MS) {
      return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function setCachedConnectionStatus(domain: string, status: ConnectionStatus) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${CONNECTION_CACHE_PREFIX}${domain}`,
      JSON.stringify({ ...status, checkedAt: Date.now() }),
    );
  } catch {
    // ignore quota errors
  }
}

export default function SidebarInsetHeader() {
  const [notifcations, setNotifications] = useState<Notifications[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = useSupabaseUser();
  const role = useUserRole();
  const roleLoading = useUserRoleLoading();
  const { selectedSite, orders, isLoadingOrders } = useSiteContext();

  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddingNewSite = searchParams.get("intent") === "new-site";
  const activeSite = isAddingNewSite
    ? ""
    : (searchParams.get("site") ?? selectedSite);
  const pathname = usePathname();
  const isOnSetupRoute = Boolean(pathname?.startsWith("/dashboard/onboarding"));
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const tempReadNotifications = useRef<string[]>([]);

  // WordPress connection status — checked live against wp_key, not the stale
  // tour boolean. Cached for 30 days so we don't hammer the API on every render.
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const checkConnection = useCallback(async () => {
    if (!activeSite) return;

    setIsCheckingConnection(true);
    try {
      const res = await fetch("/api/wordpress/connection-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: activeSite }),
      });

      const data = await res.json();

      if (res.ok && data.status) {
        const status: ConnectionStatus = {
          status: data.status,
          message: data.message,
          details: data.details,
          checkedAt: Date.now(),
        };
        setConnectionStatus(status);
        setCachedConnectionStatus(activeSite, status);
      } else {
        const status: ConnectionStatus = {
          status: "error",
          message: data.error || data.message || "Failed to check connection",
          details: {
            pluginInstalled: false,
            hasSecret: false,
            hasSignature: false,
            signatureExpired: false,
            hmacVerifiedAt: null,
            rumAssignedAt: null,
            entitled: false,
            hmacExpiresAt: null,
          },
          checkedAt: Date.now(),
        };
        setConnectionStatus(status);
        setCachedConnectionStatus(activeSite, status);
      }
    } catch (err: any) {
      const status: ConnectionStatus = {
        status: "error",
        message: err.message || "Network error",
        details: {
          pluginInstalled: false,
          hasSecret: false,
          hasSignature: false,
          signatureExpired: false,
          hmacVerifiedAt: null,
          rumAssignedAt: null,
          entitled: false,
          hmacExpiresAt: null,
        },
        checkedAt: Date.now(),
      };
      setConnectionStatus(status);
      setCachedConnectionStatus(activeSite, status);
    } finally {
      setIsCheckingConnection(false);
    }
  }, [activeSite]);

  // Load cached status on mount/activeSite change for instant UI feedback,
  // but ALWAYS kick off a live check so wpConfigured reflects real wp_key
  // state instead of a stale cached "verified" from before a delete/re-add.
  useEffect(() => {
    if (activeSite) {
      const cached = getCachedConnectionStatus(activeSite);
      if (cached) {
        setConnectionStatus(cached);
      }
      checkConnection();
    } else {
      setConnectionStatus(null);
    }
  }, [activeSite, checkConnection]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (!dropdownRef.current?.contains(target)) {
        setShowNotifications(false);

        if (tempReadNotifications.current.length > 0) {
          const idsToMark = [...tempReadNotifications.current];
          tempReadNotifications.current = [];
          sessionStorage.removeItem("ss-notifications");

          updateNotifications(idsToMark).catch(() => {});
        }
      }
    }

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const key = `ss-notifications`;

    // clean up expired notification caches
    cleanExpiredCache({ prefix: key, session_Storage: true });

    const cachedNotifcations = async () => {
      if (!user?.id) return;

      const { response } = await cachedData({
        fn: getNotifications,
        key: key,
        session_Storage: true,
        ttl: 60 * 60 * 1000, // cached till 1 hour
      });

      setNotifications(response as Notifications[]);
    };

    cachedNotifcations();
  }, [user]);

  // The setup entry point shows while there is still work to do: no site at
  // all, or the selected site has not finished its WordPress configuration.
  // We read live wp_key state (plugin installed + signature + verified) rather
  // than trusting the stale tour flags on the orders row.
  const selectedOrder = orders?.find((o) => o.website_name === activeSite);

  const pluginInstalled = Boolean(connectionStatus?.details?.pluginInstalled);
  const hasValidSignature = Boolean(
    connectionStatus?.details?.hasSignature &&
      !connectionStatus?.details?.signatureExpired,
  );
  const isSignatureVerified = Boolean(
    connectionStatus?.details?.hmacVerifiedAt,
  );

  // Payment reads the flag, not the row: an order exists as soon as the site
  // is connected, and only order_status = true (flipped by the Stripe webhook
  // / reconcile endpoint) means payment actually landed.
  const isPaid = selectedOrder?.order_status === true;
  const wpConfigured = pluginInstalled && hasValidSignature && isSignatureVerified;
  const needsSetup = !activeSite || !wpConfigured || !isPaid;

  // Hovering "Finish setup" shows what is left for THIS site, not a pitch.
  // Per-site only. "Done" for the incoming steps is decided by live wp_key
  // state for THIS site, never by account-wide signals or stale tour flags.
  const setupSteps = [
    { label: "Payment done", done: isPaid },
    {
      label: "Site connected",
      done: pluginInstalled && hasValidSignature,
    },
    {
      label: "Plugin connected & verified",
      done: wpConfigured,
    },
  ];

  const stepsLeft = setupSteps.filter((step) => !step.done).length;

  return (
    <header className="sticky z-50 top-0 flex h-16 shrink-0 items-center bg-primary-foreground dark:bg-secondary-background justify-between border-b">
      <div className="flex items-center gap-1 px-3">
        <SidebarTrigger className="ring-0 focus-within:ring-0 border-0" />
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
      <div
        className="relative cursor-pointer mt-2 mr-22 flex items-center gap-4"
        onMouseDown={(e) => {
          e.stopPropagation();
          setShowNotifications((prev) => !prev);
        }}
      >
        {role === "user" && needsSetup ? (
          <CustomTooltip
            content={
              <div className="flex w-52 flex-col gap-2 p-1">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Progress
                </p>
                <ul className="flex flex-col gap-1.5">
                  {setupSteps.map((step) => (
                    <li
                      key={step.label}
                      className="flex items-center gap-2 text-[11px] leading-none"
                    >
                      {step.done ? (
                        <Check className="size-3 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="size-3 shrink-0 opacity-30" />
                      )}
                      <span className={step.done ? "" : "opacity-60"}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] leading-relaxed opacity-60">
                  {stepsLeft === 0
                    ? "Everything is configured."
                    : isOnSetupRoute
                      ? "You're already on the setup screen."
                      : `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} left — click to continue.`}
                </p>
              </div>
            }
            side="bottom"
            delay={200}
            trigger={
              <button
                onClick={() => {
                  if (isOnSetupRoute) return;
                  router.push(
                    activeSite
                      ? `/dashboard/onboarding?site=${activeSite}`
                      : "/dashboard/onboarding",
                  );
                }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label="Setup status"
                disabled={isOnSetupRoute}
                className={`text-xs font-bold underline text-primary/80 decoration-dotted underline-offset-4 ${
                  isOnSetupRoute
                    ? "cursor-help opacity-60"
                    : "cursor-pointer hover:text-primary/70"
                }`}
              >
                Setup status
              </button>
            }
          />
        ) : null}

        <span className="relative">
          <Bell
            size={20}
            className="dark:fill-secondary-background text-primary/30"
          />

          {notifcations.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
              {notifcations.length}
            </span>
          )}
        </span>

        {showNotifications &&
          createPortal(
            <div
              ref={dropdownRef}
              onMouseDown={(e) => e.stopPropagation()}
              className="fixed max-w-1/2 md:w-87.5 overflow-y-scroll top-13 h-auto md:h-auto max-h-87.5 right-22 z-50 p-4 bg-slate-600 text-primary-foreground dark:text-primary text-sm rounded-sm shadow"
              style={{ scrollbarWidth: "none" }}
            >
              <p>Notifications</p>
              <br />
              {notifcations.length === 0 && (
                <p className="px-2 text-xs py-1">
                  You&apos;re all caught up. New notifications will appear here.
                </p>
              )}
              <>
                {notifcations.map((x) => (
                  <div
                    className="px-2 cursor-pointer hover:bg-slate-500/20 text-xs py-2 border-y border-y-primary-foreground/10"
                    key={x.id}
                    onClick={() => {
                      tempReadNotifications.current.push(x.id!); // notifications that are viewed

                      return setNotifications(
                        notifcations.filter((n) => n !== x),
                      );
                    }}
                  >
                    <div className="font-mono space-y-2">
                      <p className="capitalize">{x.type}</p>
                      <p>{x.message}</p>
                      {/* {!x.link ? (
                        <></>
                      ) : (
                        <Link
                          className="text-blue-400 hover:text-blue-500"
                          href={x.link}
                        >
                          Click here
                        </Link>
                      )} */}
                    </div>
                  </div>
                ))}
              </>
            </div>,
            document.body,
          )}
      </div>
      <ThemeToggle />
    </header>
  );

  /**
   *
   * @returns unread notifications for the current user
   */
  async function getNotifications() {
    if (!user?.id) return []; // return with empty array of notifcations

    const res = await fetch("/api/notifications/get", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body: any = await res.json();

    if (!res.ok) {
      throw new Error(body.message ?? "Error fetching notifications");
    }

    return body.data;
  }

  /**
   *
   * @param ids notifications that are viewed / read
   */
  async function updateNotifications(ids: string[]) {
    if (!ids.length) return;

    const res = await fetch("/api/notifications/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: ids }),
    });

    if (res.status === 401) return;

    const body: any = await res.json();

    if (!res.ok) {
      throw new Error(body.message ?? "Failed to update notifications", {
        cause: body.status,
      });
    }
  }
}
