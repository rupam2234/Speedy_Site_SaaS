"use client";

import { Bell, Check, Circle, MessageSquare } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import {
  useSupabaseUser,
  useUserRole,
} from "../utils/supabase/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { cachedData, cleanExpiredCache } from "../utils";
import { createPortal } from "react-dom";
import { Notifications } from "@/app/api";
import { CustomTooltip } from "../theme";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { getSetupProgress } from "@/lib/setupProgress";

export default function SidebarInsetHeader() {
  const [notifcations, setNotifications] = useState<Notifications[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = useSupabaseUser();
  const role = useUserRole();
  const { selectedSite, orders } = useSiteContext();

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

  // Setup status is derived from the same server state the onboarding flow
  // writes (orders.tour + order_status), so this dropdown can never disagree
  // with the steps page: site_selected / plugin_verified / service_active.
  const selectedOrder = orders?.find((o) => o.website_name === activeSite);
  const setupProgress = getSetupProgress(selectedOrder);

  const isSiteConnected = setupProgress.siteConnected;
  const isPluginVerified = setupProgress.pluginVerified;
  // order_status flips to true only via the Stripe webhook / reconcile.
  const isPaid = setupProgress.serviceActive;
  const setupDone = isSiteConnected && isPluginVerified && isPaid;

  // Hovering the button shows what is left for THIS site, not a pitch.
  const setupSteps = [
    { label: "Site connected", done: isSiteConnected },
    { label: "Plugin connected & verified", done: isPluginVerified },
    { label: "Payment done", done: isPaid },
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
        {role === "user" ? (
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
                    ? "Everything is configured for this site."
                    : isOnSetupRoute
                      ? "You're already on the setup screen."
                      : `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} left: click to continue.`}
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
                {setupDone ? "Connected" : "Setup status"}
              </button>
            }
          />
        ) : null}

        {role === "user" && isPaid && activeSite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/dashboard/managed-wp/status?site=${encodeURIComponent(activeSite)}`
              );
            }}
            title="Chat with your performance expert"
            aria-label="Chat with your performance expert"
            className="flex items-center justify-center rounded-full p-1 text-primary/50 hover:text-primary transition-colors cursor-pointer"
          >
            <MessageSquare size={19} />
          </button>
        )}

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
                    className="px-2 cursor-pointer hover:bg-slate-500/20 text-xs py-2 border-y border-y-primary-foreground/10 transition-colors"
                    key={x.id}
                    onClick={() => {
                      if (x.id) tempReadNotifications.current.push(x.id);
                      setNotifications(notifcations.filter((n) => n !== x));
                      setShowNotifications(false);
                      if (x.link) {
                        router.push(x.link);
                      }
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <p className="capitalize font-semibold text-primary-foreground/90">
                          {x.type?.replace("_", " ")}
                        </p>
                        {x.link && (
                          <span className="text-[10px] text-blue-300 font-medium">
                            Open
                          </span>
                        )}
                      </div>
                      <p className="text-primary-foreground/80 font-sans text-xs">
                        {x.message}
                      </p>
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
