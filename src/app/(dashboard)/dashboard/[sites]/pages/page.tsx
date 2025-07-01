"use client";

import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CircleCheck, Group, InfoIcon, Loader } from "lucide-react";
import { useSiteContext } from "@/app/(dashboard)/siteContext";

export default function PageGroups() {
  const [isConnecting, setConnecting] = useState(false);
  const { selectedSite } = useSiteContext();
  const [hasPages, setPages] = useState();

  // keeping selectedSite on session storage to send over to the popup
  useEffect(() => {
    if (typeof window !== "undefined" && selectedSite) {
      sessionStorage.setItem("selectedSite", selectedSite);
    }
  }, [selectedSite]);

  async function fetchAuthUrl(): Promise<void> {
    try {
      setConnecting(true);
      const res = await fetch("/api/auth/get-auth-url");
      const data = await res.json();

      if (data.authUrl) {
        const popup = window.open(
          data.authUrl,
          "_blank",
          "width=500,height=600"
        );

        if (popup) {
          const pollTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimer);
              setConnecting(false); // Stop loading once window is closed
            }
          }, 500);
        } else {
          console.error("Popup was blocked");
          setConnecting(false);
        }
      } else {
        console.error("Failed to get the auth URL");
        setConnecting(false);
      }
    } catch (error) {
      console.error("Auth URL fetch error:", error);
      setConnecting(false);
    }
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;

      const { status, pages } = event.data;

      if (status === "site_selected") {
        setConnecting(false);
        setPages(pages);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="flex flex-1 flex-row md:flex-row items-center justify-between gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
        <span className="flex gap-2 items-center">
          <Group
            size={30}
            className="fill-blue-400 dark:text-accent-foreground"
          />
          <h2 className="text-md md:text-2xl font-bold text-primary">
            Page Groups
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon size={25} className="text-primary/70" />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="w-[200px] md:w-[400px] text-[16px]"
            >
              Page groups allow you to pinpoint the web vitals of individual
              pages that are affecting the overall origin-level web vitals. When
              your origin is underperforming, identifying specific URLs can
              reveal what&apos;s causing the issue and highlight similar URLs
              that may also be experiencing problems.
            </TooltipContent>
          </Tooltip>
        </span>
      </div>

      {/* Drawer */}
      <Drawer>
        <DrawerTrigger>
          <span
            className={`border-green-500 hover:cursor-pointer border-2 text-sm flex gap-2 items-center font-semibold px-4 py-2 bg-popover dark:bg-secondary-background rounded-md`}
          >
            <CircleCheck size={20} className={`fill-green-500`} />
            <p>Sync Pages</p>
          </span>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto h-[300px] w-full max-w-3xl">
            <DrawerHeader>
              {hasPages ? (
                <>
                  <DrawerTitle className="text-xl mb-5 text-green-500">
                    Pages Acquired.
                  </DrawerTitle>
                  <DrawerDescription className="text-primary dark:text-primary">
                    We have acquired page samples from your site and sent them
                    to process web vital status. You can now close this drawer.
                    Click on close or somewhere outside.
                  </DrawerDescription>
                </>
              ) : (
                <>
                  <DrawerTitle className="text-xl mb-5 text-red-500">
                    Access Required
                  </DrawerTitle>
                  <DrawerDescription className="text-primary dark:text-primary">
                    To identify the pages most impacting your Core Web Vitals,
                    we need access to your Google Search Console. This lets us
                    analyze your high-traffic pages, find url groups with the
                    most impact and then run our tests to help you find out what
                    and where to fix issues.
                  </DrawerDescription>
                </>
              )}
            </DrawerHeader>

            <DrawerFooter>
              <button
                onClick={fetchAuthUrl}
                disabled={isConnecting}
                className="flex justify-center items-center gap-2 border py-[6px] px-4 cursor-pointer hover:dark:bg-secondary-background/70 hover:bg-gray-500/30 rounded-sm dark:bg-secondary-background bg-gray-500/10 border-gray-500/20"
              >
                {isConnecting ? (
                  <div className="animate-spin">
                    <Loader size={25} />
                  </div>
                ) : (
                  "Connect Google Search Console"
                )}
              </button>

              <DrawerClose>
                <div className="hover: cursor-pointer">Close</div>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
