"use client";

import { Bell, Check, Circle } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { cachedData, cleanExpiredCache } from "../utils";
import { createPortal } from "react-dom";
import { Notifications } from "@/app/api";
import { CustomTooltip } from "../theme";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

export default function SidebarInsetHeader() {
  const [notifcations, setNotifications] = useState<Notifications[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = useSupabaseUser();
  const { selectedSite, orders } = useSiteContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Resolve the active site the same way the setup tour does (url site -> adding
  // a new site -> context selection), otherwise this badge and the tour can
  // disagree about which site is being configured -- e.g. a stale "Connected"
  // badge for the previous site while the tour is clearly adding a new one.
  const isAddingNewSite = searchParams.get("intent") === "new-site";
  const activeSite = isAddingNewSite
    ? ""
    : (searchParams.get("site") ?? selectedSite);
  const pathname = usePathname();
  // While the user is already inside the setup flow the "Finish setup" CTA is
  // informational only. Navigating again drops the current intent (e.g.
  // ?intent=new-site) and lets the tour fall back to a previously-selected,
  // fully configured site -- the exact "jumps to the old site" bug.
  const isOnSetupRoute = Boolean(pathname?.startsWith("/dashboard/onboarding"));
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const tempReadNotifications = useRef<string[]>([]); // holds the notifications that are viewed/read by user

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (!dropdownRef.current?.contains(target)) {
        setShowNotifications(false);

        // silently update the notifications on db
        updateNotifications(tempReadNotifications.current);

        // if update success / no error thrown, we can flash the cache
        sessionStorage.removeItem("ss-notifications");

        // reset temp notification
        tempReadNotifications.current = [];
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
  const selectedOrder = orders?.find((o) => o.website_name === activeSite);
  const siteTour = (selectedOrder?.tour ?? {}) as Record<string, boolean>;
  // signature_verified is the key the setup step records last, and it is what
  // the tour marks the plugin step (and therefore the whole setup) done with.
  // plugin_installed is only an intermediate key, so requiring it here too is
  // how the header and the tour drifted apart.
  const wpConfigured = Boolean(siteTour.signature_verified);
  const needsSetup = !activeSite || !wpConfigured;

  // Hovering "Finish setup" shows what is left for THIS site, not a pitch.
  // Verifying the installation is the tail of the plugin step (not its own
  // step), so "plugin connected" means verified -- the same condition that
  // marks the site complete, so tooltip and badge agree.
  // Per-site only. "Done" for the incoming steps is decided by the order row of
  // the site being configured (selectedOrder), never by account-wide signals:
  // an order row means THIS site already consumed its managed_wp entitlement
  // (paid) and is connected. The old account-level `plan` / `orders.length`
  // reads reported OTHER sites' state, so on the "add a new site" flow they
  // claimed "payment done" + "site connected" while this site was still on the
  // pay step. A brand-new site (no activeSite -> no selectedOrder) honestly
  // shows every step still pending.
  const setupSteps = [
    { label: "Payment done", done: Boolean(selectedOrder) },
    { label: "Site connected", done: Boolean(selectedOrder) },
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
        {!needsSetup && activeSite ? (
          /* Site is fully configured: show it as a status, not a call to action. */
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
            Connected
          </span>
        ) : needsSetup ? (
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
                  // Already inside setup: never navigate again, or the current
                  // intent (e.g. ?intent=new-site) is dropped and the tour falls
                  // back to a previously-selected configured site.
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
                className={`text-xs font-bold underline decoration-dotted underline-offset-4 ${
                  isOnSetupRoute
                    ? "cursor-help opacity-60"
                    : "cursor-pointer hover:text-primary-foreground/80"
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
    const res = await fetch("/api/notifications/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: ids }),
    });

    const body: any = await res.json();

    if (!res.ok) {
      throw new Error(body.message ?? "Failed to update notifications", {
        cause: body.status,
      });
    }
  }
}
