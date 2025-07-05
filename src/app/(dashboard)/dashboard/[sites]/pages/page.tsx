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
import {
  AlertTriangle,
  Bug,
  CircleCheck,
  Expand,
  FileWarning,
  Group,
  Loader,
  LoaderIcon,
  Trash2,
} from "lucide-react";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import { useClerk } from "@clerk/nextjs";
import { PageCrux } from "@/data/cruxData";
import { getRanges } from "../cwv/helper/referenceAreaHandler";

export default function PageGroups() {
  const [isConnecting, setConnecting] = useState(false);
  const { selectedSite, orders, selectedDevice } = useSiteContext();
  const { user } = useClerk();
  const [hasPages, setPages] = useState<Array<{ [key: string]: any }>>();
  const [, setJobProcessing] = useState<boolean>(false);
  const [processedPages, setprocessedPages] = useState<PageCrux[] | null>();

  // keeping selectedSite on session storage to send over to the popup
  useEffect(() => {
    const email = user?.emailAddresses?.at(-1)?.emailAddress;
    const activeSite = orders?.find((x) => x.user_email === email);

    localStorage.setItem("selectedSite", selectedSite);
    localStorage.setItem("userEmail", email!);

    if (activeSite !== null && activeSite !== undefined) {
      sessionStorage.setItem("gsc_t", activeSite.gsc_token!);
    }
  }, [selectedSite, user]);

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

  useEffect(() => {
    if (!hasPages || hasPages.length === 0) return;

    const pages = hasPages.map((x) => x.url);

    setJobProcessing(true);
    // queue the job
    fetch("/api/jobs/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pages),
    })
      .then((res) => res.json())
      .then(() => {
        // Then: trigger processing immediately
        return fetch("/api/jobs/process", { method: "POST" });
      })
      .then((res) => res.json())
      .catch(console.error)
      .finally(() => setJobProcessing(false));
  }, [hasPages]);

  // check for available pages on crux_job
  useEffect(() => {
    async function fetchPagesWithVitals() {
      if (selectedSite) {
        const res = await fetch("/api/jobs/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedSite),
        });

        const json = await res.json();

        if (!res) {
          console.error("Missing pages with crux records!");
          setprocessedPages(null);
          return;
        }

        if (json.data[0]?.results.length === undefined) {
          setprocessedPages(null);
        } else {
          setprocessedPages(json.data[0]?.results);
        }
      }
    }

    fetchPagesWithVitals();
  }, [, selectedSite]);

  // helper functions
  function PageAddressOrganiser(pageArray: PageCrux[] | null) {
    if (!pageArray || pageArray === null) return <></>;

    const flattened = pageArray.flat();

    const uniquePaths = [
      ...new Set(flattened.map((x) => x.page_address.split("/")[3])),
    ];

    return (
      <div className="space-y-3 mt-8">
        {/* Header for desktop only */}
        <div className="hidden md:grid grid-cols-10 gap-2 items-center px-3 font-semibold">
          <span className="col-span-4">Page</span>
          <span className="col-span-1">LCP</span>
          <span className="col-span-1">INP</span>
          <span className="col-span-1">CLS</span>
          <span className="col-span-1">TTFB</span>
          <span className="col-span-1">STATUS</span>
        </div>

        {uniquePaths.map((pathSegment, index) => {
          const match = flattened.find(
            (x) =>
              x.page_address?.split("/")[3] === pathSegment &&
              x.device_type === selectedDevice
          );

          const deviceBased = match?.record ?? null;

          const lcp =
            deviceBased?.metrics?.["largest_contentful_paint"]?.percentiles
              ?.p75;
          const cls =
            deviceBased?.metrics?.["cumulative_layout_shift"]?.percentiles?.p75;
          const inp =
            deviceBased?.metrics?.["interaction_to_next_paint"]?.percentiles
              ?.p75;
          const ttfb =
            deviceBased?.metrics?.["experimental_time_to_first_byte"]
              ?.percentiles?.p75;

          const lcp_ranges = getRanges("largest_contentful_paint");
          const cls_ranges = getRanges("cumulative_layout_shift");
          const inp_ranges = getRanges("interaction_to_next_paint");
          const ttfb_ranges = getRanges("experimental_time_to_first_byte");

          let status: string;

          if (lcp == null && cls == null && inp == null) {
            status = "--";
          } else if (
            lcp! <= lcp_ranges.b &&
            cls! <= cls_ranges.b &&
            inp! <= inp_ranges.b
          ) {
            status = "Passing";
          } else {
            status = "Failing";
          }

          const getColor = (value: number | undefined, ranges: any) => {
            if (value == null) return "text-gray-400";
            if (value <= ranges.b) return "text-green-500";
            if (value <= ranges.c) return "text-yellow-500";
            return "text-red-400";
          };

          return (
            <div key={index} className="p-3 border rounded-sm">
              {/* Mobile layout */}
              <div className="md:hidden space-y-1">
                <div className="text-accent-foreground/70 font-semibold">
                  /{pathSegment}
                </div>
                <div className={`text-sm ${getColor(lcp!, lcp_ranges)}`}>
                  <strong>LCP:</strong> {lcp ?? "--"}
                </div>
                <div className={`text-sm ${getColor(inp!, inp_ranges)}`}>
                  <strong>INP:</strong> {inp ?? "--"}
                </div>
                <div className={`text-sm ${getColor(cls!, cls_ranges)}`}>
                  <strong>CLS:</strong> {cls ?? "--"}
                </div>
                <div className={`text-sm ${getColor(ttfb!, ttfb_ranges)}`}>
                  <strong>TTFB:</strong> {ttfb ?? "--"}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    status === "Passing"
                      ? "text-green-500"
                      : status === "Failing"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  <strong>Status:</strong> {status}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    status === "Passing"
                      ? "text-green-500"
                      : status === "Failing"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {status}
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden md:grid grid-cols-10 gap-2 items-center font-semibold">
                <span className="col-span-4 text-accent-foreground/70">
                  /{pathSegment}
                </span>
                <span className={`col-span-1 ${getColor(lcp!, lcp_ranges)}`}>
                  {lcp ?? "--"}
                </span>
                <span className={`col-span-1 ${getColor(inp!, inp_ranges)}`}>
                  {inp ?? "--"}
                </span>
                <span className={`col-span-1 ${getColor(cls!, cls_ranges)}`}>
                  {cls ?? "--"}
                </span>
                <span className={`col-span-1 ${getColor(ttfb!, ttfb_ranges)}`}>
                  {ttfb ?? "--"}
                </span>
                <span
                  className={`col-span-1 ${
                    status === "Passing"
                      ? "text-green-500"
                      : status === "Failing"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {status}
                </span>
                <span className={`col-span-1`}>
                  <div className="flex gap-2 items-center text-sm">
                    <button
                      title="Expand"
                      className="p-1 rounded-sm cursor-pointer bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Expand size={16} />
                    </button>
                    <button
                      title="Report Bug"
                      className="p-1 rounded-sm cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      <Bug size={16} />
                    </button>
                    <button
                      title="Delete"
                      className="p-1 rounded-sm cursor-pointer bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // function handleLabView() {
  //   return <LabView />;
  // }

  return (
    <div className="p-5">
      <div className="flex flex-1 flex-row md:flex-row items-center justify-between gap-6">
        {/* Header */}
        <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-2 items-center cursor-help">
                <Group
                  size={30}
                  className="fill-blue-400 dark:text-accent-foreground"
                />
                <h2 className="text-md md:text-2xl font-bold text-primary">
                  Page Groups
                </h2>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="w-[200px] md:w-[600px] ">
              Page groups allow you to pinpoint the web vitals of individual
              pages that are affecting the overall origin-level web vitals. When
              your origin is underperforming, identifying specific URLs can
              reveal what&apos;s causing the issue and highlight similar URLs
              that may also be experiencing problems.
            </TooltipContent>
          </Tooltip>
        </div>

        <span className="relative group">
          {processedPages === undefined ? (
            // Show loader while still processing
            <Tooltip>
              <TooltipTrigger>
                <LoaderIcon size={24} className="animate-spin" />
              </TooltipTrigger>
              <TooltipContent side="left">Checking...</TooltipContent>
            </Tooltip>
          ) : processedPages !== null ? (
            // Show success if pages exist
            <Tooltip>
              <TooltipTrigger>
                <CircleCheck size={26} className="text-green-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left">
                You have synced pages from GSC ✓
              </TooltipContent>
            </Tooltip>
          ) : processedPages === null ? (
            // Show warning if processedPages is empty or falsey
            <Tooltip>
              <TooltipTrigger>
                <FileWarning
                  size={24}
                  className="text-yellow-500 cursor-help"
                />
              </TooltipTrigger>
              <TooltipContent side="left">
                Missing pages under the selected domain to monitor!
              </TooltipContent>
            </Tooltip>
          ) : (
            <></>
          )}
        </span>
      </div>

      {/* Content Section */}

      {processedPages !== null ? (
        <>{PageAddressOrganiser(processedPages!)}</>
      ) : (
        <Drawer>
          {/* drawer content - conditional*/}
          <DrawerContent style={{ borderRadius: 0, paddingTop: 0 }}>
            <div className="mx-auto h-[300px] w-full max-w-3xl">
              <DrawerHeader>
                {hasPages ? (
                  <>
                    <DrawerTitle className="text-xl mb-5 text-green-500">
                      Pages Acquired.
                    </DrawerTitle>
                    <DrawerDescription className="text-primary dark:text-primary">
                      We have acquired page samples from your site and sent them
                      to process web vital status. You can now close this
                      drawer. Click on close or somewhere outside.
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
                      most impact and then run our tests to help you find out
                      what and where to fix issues.
                    </DrawerDescription>
                  </>
                )}
              </DrawerHeader>

              <DrawerFooter>
                {!hasPages && (
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
                )}

                <DrawerClose>
                  <div className="hover: cursor-pointer">Close</div>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>

          {/* Drawer trigger connected to text */}
          <div className="mt-6">
            {hasPages ? (
              Array.isArray(hasPages) && hasPages.length > 0 ? (
                <>
                  {hasPages.map((x) => (
                    <div className="flex gap-2 items-center" key={x.url}>
                      <span>{x.url}</span>
                      <span>{x.clicks}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>No page found!</>
              )
            ) : (
              <div className="p-6 border rounded-sm dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 flex flex-col items-center text-center gap-2">
                <AlertTriangle className="text-yellow-500" size={32} />
                <h3 className="font-semibold text-lg">No Pages Found</h3>
                <p className="text-muted-foreground text-sm">
                  Please manually assign pages to monitor or fetch pages via{" "}
                  <DrawerTrigger asChild>
                    <span className="text-orange-500 font-normal underline hover:cursor-pointer">
                      Google Search Console
                    </span>
                  </DrawerTrigger>{" "}
                  option at the top right corner to get started.
                </p>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
}
