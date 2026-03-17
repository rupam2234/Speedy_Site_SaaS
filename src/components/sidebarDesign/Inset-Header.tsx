"use client";

import { Bell } from "lucide-react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { useSupabaseUser } from "../utils/supabase/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { cachedData, cleanExpiredCache } from "../utils";
import { Notifications } from "@/app/api/dataTypes";
import { createPortal } from "react-dom";

export default function SidebarInsetHeader() {
  const [notifcations, setNotifications] = useState<Notifications[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = useSupabaseUser();
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

  return (
    <header className="sticky z-50 top-0 flex h-16 shrink-0 items-center bg-primary-foreground dark:bg-secondary-background justify-between border-b">
      <div className="flex items-center gap-1 px-3">
        <SidebarTrigger className="ring-0 focus-within:ring-0 border-0" />
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
      <div
        className="relative cursor-pointer mt-2 mr-22"
        onMouseDown={(e) => {
          e.stopPropagation();
          setShowNotifications((prev) => !prev);
        }}
      >
        <Bell
          size={20}
          className="dark:fill-secondary-background text-primary/30"
        />

        {notifcations.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
            {notifcations.length}
          </span>
        )}

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
