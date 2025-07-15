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
  Layers,
  Loader,
  LoaderIcon,
  SquarePlus,
  Trash2,
} from "lucide-react";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import { useClerk } from "@clerk/nextjs";
import { PageCrux } from "@/data/cruxData";
import { getRanges } from "../cwv/helper/referenceAreaHandler";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import LabView from "./helper/lab";
import { pageMetricCache } from "@/components/globalData/cachedPageData";
import { useRouter } from "next/navigation";

export default function PageGroups() {
  const [isConnecting, setConnecting] = useState(false);
  const { selectedSite, orders, selectedDevice } = useSiteContext();
  const { user } = useClerk();
  const [hasPages, setPages] = useState<Array<{ [key: string]: any }>>();
  const [, setJobProcessing] = useState<boolean>(false);
  const [pagesProcessing, setPagesProcessing] = useState<boolean>(false);
  const [processedPages, setProcessedPages] = useState<PageCrux[] | null>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [urls, setUrls] = useState<string[] | null>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [expandedType, setExpanded] = useState<null | {
    path: string;
    type: "lab" | "todo";
  }>(null);
  const [showNoPagesFallback, setShowNoPagesFallback] = useState(false);

  const router = useRouter();

  //#region Zustand Section
  const pageMetric = pageMetricCache((state) => state.pageMetric);
  const metricSite = pageMetricCache((state) => state.metricSite);
  const setPageMetric = pageMetricCache((state) => state.setPageMetric);
  const resetPageMetric = pageMetricCache((state) => state.reset);
  const hasHydrated = pageMetricCache((state) => state._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return; // Wait for persisted state to load

    if (
      metricSite === selectedSite &&
      Array.isArray(pageMetric) &&
      pageMetric.length > 0
    ) {
      // use cached data
      return;
    }

    resetPageMetric();

    const loadMetricData = async () => {
      try {
        const res = await fetch("/api/pages/lab-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: selectedSite }),
        });

        if (!res.ok) throw new Error("Error fetching page metric data");

        const data = await res.json();
        setPageMetric(selectedSite, data.data);
      } catch (error) {
        console.error("Failed to fetch page metric data:", error);
      }
    };

    loadMetricData();
  }, [selectedSite, hasHydrated]);
  //#endregion

  // auto close the drawer when page is processing
  useEffect(() => {
    if (pagesProcessing) {
      setIsDrawerOpen(false);
    }
  }, [pagesProcessing]);

  console.log(urls?.length);

  // Show "No Pages Found" fallback after 4s if no URLs
  useEffect(() => {
    if (urls?.length === 0) {
      const timer = setTimeout(() => {
        setShowNoPagesFallback(true);
      }, 4000); // 4s delay before showing fallback UI

      return () => clearTimeout(timer);
    } else {
      setShowNoPagesFallback(false);
    }
  }, [urls]);

  // Save selected site/email to local/session storage
  useEffect(() => {
    const email = user?.emailAddresses?.at(-1)?.emailAddress;
    const activeSite = orders?.find((x) => x.user_email === email);

    localStorage.setItem("selectedSite", selectedSite);
    localStorage.setItem("userEmail", email!);

    if (activeSite !== null && activeSite !== undefined) {
      sessionStorage.setItem("gsc_t", activeSite.gsc_token!);
    }
  }, [selectedSite, user]);

  // Open GSC auth URL in a popup
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
              setConnecting(false);
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

  // Listen to GSC message after popup
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

  // Send pages to processing queue when they are received
  useEffect(() => {
    if (!hasPages || hasPages.length === 0) return;

    const runJob = async () => {
      const pages = hasPages.map((x) => x.url);

      try {
        setJobProcessing(true);
        setPagesProcessing(true);

        const queueRes = await fetch("/api/jobs/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pages),
        });

        await queueRes.json();

        const processRes = await fetch("/api/jobs/process", {
          method: "POST",
        });

        await processRes.json();
      } catch (error) {
        console.error("Job processing failed:", error);
      } finally {
        setJobProcessing(false);

        // Poll for job status every 4 seconds until it's done
        const pollForJobCompletion = async () => {
          try {
            const res = await fetch("/api/jobs/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ domain: selectedSite }),
            });

            const json = await res.json();

            if (json.status === "done") {
              setPagesProcessing(false);
            } else if (
              json.status === "processing" ||
              json.status === "pending"
            ) {
              setTimeout(pollForJobCompletion, 4000); // retry after 4 seconds
            } else {
              console.warn("Unexpected job status:", json.status);
              setPagesProcessing(false);
            }
          } catch (err) {
            console.error("Polling error:", err);
            setPagesProcessing(false);
          }
        };
        pollForJobCompletion();
      }
    };

    runJob();
  }, [hasPages]);

  // Fetch processed pages only when not in processing
  useEffect(() => {
    async function fetchPagesWithVitals() {
      if (!selectedSite || pagesProcessing) return;

      const res = await fetch("/api/jobs/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSite),
      });

      const json = await res.json();

      if (
        !res.ok ||
        !json.data?.[0]?.urls ||
        json.data?.[0]?.urls.length === 0 ||
        (json.data?.[0]?.urls.length === 1 &&
          json.data?.[0]?.urls?.[0].length === 0)
      ) {
        console.error("Missing pages with crux records!");
        setProcessedPages(null);
        setUrls([]);
      } else {
        setProcessedPages(json.data[0]?.results);
        setUrls(json.data[0]?.urls);
      }
    }

    fetchPagesWithVitals();
  }, [selectedSite, pagesProcessing]);

  // Checkbox URL handler
  function handleCheck(url: string, isChecked: boolean) {
    setSelectedUrls((prev) =>
      isChecked ? [...prev, url] : prev.filter((d) => d !== url)
    );
  }

  // delete url handler
  async function handlePageDelete() {
    if (!processedPages || !urls) return;

    // Remove pages with addresses in selectedUrls
    const updatedPages = urls.filter((page) => !selectedUrls.includes(page));

    setUrls(updatedPages);
    setSelectedUrls([]);
    setIsConfirmingDelete(false);

    await fetch("/api/pages/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: selectedSite,
        urls: selectedUrls,
      }),
    });
  }

  // to do or lab expand
  function toggleExpand(type: "lab" | "todo", path: string) {
    if (expandedType?.path === path && expandedType.type === type) {
      setExpanded(null); // collapse
    } else {
      setExpanded({ path, type });
    }
  }

  // Main renderer
  function PageAddressOrganiser(
    urls: string[] | null,
    pageArray: PageCrux[] | null
  ) {
    if (!urls || urls.length === 0) return <></>;

    function getPathSegment(url: string): string {
      try {
        const path = new URL(url).pathname;
        const segments = path.split("/").filter(Boolean);
        return segments[0] || " ";
      } catch {
        return "";
      }
    }

    const flattened = pageArray?.flat() || [];

    const uniquePaths = [...new Set(urls.map(getPathSegment))].filter(Boolean);

    return (
      <div className="space-y-3 mt-8">
        {/* Header */}
        <div className="hidden h-7 md:grid grid-cols-20 gap-2 items-center px-3 font-semibold">
          <span className="col-span-1">
            {selectedUrls.length > 0 ? (
              <div className="relative ml-[-3px]">
                {!isConfirmingDelete ? (
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => setIsConfirmingDelete(true)}
                      className="dark:bg-secondary-background hover:bg-gray-200/40 bg-background p-1 rounded-sm cursor-pointer border text-primary"
                    >
                      <Trash2 size={16} />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      We collect lab data for these URLs to help optimize
                      similar pages. Delete them only if you want to monitor a
                      different or more resource-heavy page.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="absolute mt-[-15px] text-sm left-0 top-0 bg-background flex gap-2 items-center">
                    <button
                      onClick={handlePageDelete}
                      className="text-red-600 px-2 py-1 border rounded-sm cursor-pointer bg-red-100 hover:bg-red-200"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="text-muted-foreground px-2 py-1 border cursor-pointer rounded-sm bg-gray-100 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <></>
            )}
          </span>
          <span className="col-span-7">Page</span>
          <span className="col-span-2">LCP</span>
          <span className="col-span-2">INP</span>
          <span className="col-span-2">CLS</span>
          <span className="col-span-2">TTFB</span>
          <span className="col-span-2">STATUS</span>
        </div>

        {/* Cards */}
        {uniquePaths.map((pathSegment, index) => {
          const match = flattened.find(
            (x) =>
              getPathSegment(x.page_address || "") === pathSegment &&
              x.device_type === selectedDevice
          );

          const record = match?.record ?? null;
          const fullUrl =
            urls.find((url) => getPathSegment(url) === pathSegment) ?? "";

          const get = (metric: string) =>
            record?.metrics?.[metric]?.percentiles?.p75;

          const lcp = get("largest_contentful_paint");
          const cls = get("cumulative_layout_shift");
          const inp = get("interaction_to_next_paint");
          const ttfb = get("experimental_time_to_first_byte");

          const lcpRange = getRanges("largest_contentful_paint");
          const clsRange = getRanges("cumulative_layout_shift");
          const inpRange = getRanges("interaction_to_next_paint");
          const ttfbRange = getRanges("experimental_time_to_first_byte");

          let status = "--";
          const hasAnyValue = lcp != null || cls != null || inp != null;

          if (lcp != null && cls != null && inp != null) {
            status =
              lcp <= lcpRange.b && cls <= clsRange.b && inp <= inpRange.b
                ? "Passing"
                : "Failing";
          } else if (hasAnyValue) {
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
              {/* Mobile */}
              <div className="md:hidden space-y-1">
                <div className="flex gap-2 items-center">
                  <Checkbox
                    checked={selectedUrls.includes(fullUrl)}
                    onCheckedChange={(checked) =>
                      handleCheck(fullUrl, checked as boolean)
                    }
                  />
                  <span className="text-accent-foreground/70 font-semibold">
                    /{pathSegment}
                  </span>
                </div>
                <div className={`text-sm ${getColor(lcp!, lcpRange)}`}>
                  <strong>LCP:</strong> {lcp ?? "--"}
                </div>
                <div className={`text-sm ${getColor(inp!, inpRange)}`}>
                  <strong>INP:</strong> {inp ?? "--"}
                </div>
                <div className={`text-sm ${getColor(cls!, clsRange)}`}>
                  <strong>CLS:</strong> {cls ?? "--"}
                </div>
                <div className={`text-sm ${getColor(ttfb!, ttfbRange)}`}>
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
                <button
                  title="Lab Data"
                  className="p-1 cursor-pointer rounded-sm bg-blue-200/20 hover:bg-blue-200 text-white"
                  onClick={() => toggleExpand("lab", pathSegment)}
                >
                  🔬
                </button>
                {/* to do list */}
                <button
                  title="To Do's"
                  className="p-1 cursor-pointer rounded-sm bg-yellow-200/20 hover:bg-yellow-500 text-white"
                  onClick={() => toggleExpand("todo", pathSegment)}
                >
                  📋
                </button>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid grid-cols-20 gap-2 items-center font-semibold">
                <Checkbox
                  checked={selectedUrls.includes(fullUrl)}
                  onCheckedChange={(checked) =>
                    handleCheck(fullUrl, checked as boolean)
                  }
                />
                <span className="col-span-7 text-accent-foreground/70">
                  /{pathSegment}
                </span>
                <span className={`col-span-2 ${getColor(lcp!, lcpRange)}`}>
                  {lcp ?? "--"}
                </span>
                <span className={`col-span-2 ${getColor(inp!, inpRange)}`}>
                  {inp ?? "--"}
                </span>
                <span className={`col-span-2 ${getColor(cls!, clsRange)}`}>
                  {cls ?? "--"}
                </span>
                <span className={`col-span-2 ${getColor(ttfb!, ttfbRange)}`}>
                  {ttfb ?? "--"}
                </span>
                <span
                  className={`col-span-2 ${
                    status === "Passing"
                      ? "text-green-500"
                      : status === "Failing"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {status}
                </span>
                <div className="col-span-2 flex gap-2">
                  {/* lab data button */}
                  <button
                    title="Lab Data"
                    className="p-1 cursor-pointer rounded-sm bg-blue-200/20 hover:bg-blue-200 text-white"
                    onClick={() => toggleExpand("lab", pathSegment)}
                  >
                    🔬
                  </button>
                  {/* to do list */}
                  <button
                    title="To Do's"
                    className="p-1 cursor-pointer rounded-sm bg-yellow-200/20 hover:bg-yellow-500 text-white"
                    onClick={() => toggleExpand("todo", pathSegment)}
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* conditional expand for lab data and to do's */}
              {expandedType?.path === pathSegment && (
                <div className="mt-4 md:mt-0 h-auto md:h-auto p-1 md:p-4 text-sm">
                  {expandedType.type === "lab" ? (
                    <LabView url={fullUrl} device={selectedDevice} />
                  ) : (
                    <div>📋 To Do list items go here...</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function handleManualPageAdd() {
    const path = `/dashboard/${selectedSite}/add-pages`;
    router.prefetch(path);
    router.push(path);
  }

  return (
    <div className="p-5 min-h-screen">
      <div className="flex justify-between items-center gap-6">
        {/* Header */}
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2 cursor-help">
              <Layers
                size={30}
                className="fill-blue-400 dark:text-accent-foreground"
              />
              <h2 className="text-md md:text-2xl font-bold text-primary">
                Page Groups
              </h2>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-2xl">
            Page groups help you identify the key contributors to your overall
            Web Vitals as reported by Google Search Console. You can also use
            them to monitor local test results and track performance trends over
            time. Be sure to check URLs for both desktop and mobile views.
          </TooltipContent>
        </Tooltip>

        {/* Pages count badge with status */}
        <span className="relative flex gap-4 group items-center">
          {processedPages === undefined ? (
            <Tooltip>
              <TooltipTrigger>
                <LoaderIcon size={24} className="animate-spin" />
              </TooltipTrigger>
              <TooltipContent side="left">Checking...</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <div
                className={`
                      inline-flex items-center px-3 py-1 text-sm font-medium rounded-full
                      border
                      ${
                        processedPages === null
                          ? "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300"
                          : "bg-gray-100 border-gray-300 text-gray-800 dark:bg-secondary-background dark:border-gray-700 dark:text-gray-200"
                      }
                      cursor-help
                    `}
              >
                {/* Main content for pages count */}
                {urls?.length ?? 0 <= 10 ? (
                  <span>{urls?.length}/10 Pages</span>
                ) : (
                  <span>0/10 Pages</span>
                )}

                {/* SquarePlus Icon now inside the same div, with its own styling */}
                <TooltipTrigger>
                  {/* Added ml-2 for spacing, and classes for border and rounded corners */}
                  <SquarePlus
                    onClick={handleManualPageAdd}
                    className="ml-2 w-5 h-5 cursor-pointer border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Add pages manually</TooltipContent>
              </div>
            </Tooltip>
          )}
        </span>
      </div>

      {/* Main display logic */}
      {pagesProcessing ? (
        <div className="mt-6 flex items-center justify-center text-muted-foreground">
          <LoaderIcon className="animate-spin inline-block mr-2" />
          Processing pages for Core Web Vitals. This process requires at least
          60 seconds to complete.
        </div>
      ) : urls === undefined ||
        urls === null ||
        (urls?.length === 0 && showNoPagesFallback) ? (
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <div className="px-8 py-14 border rounded-md bg-gray-50 dark:bg-secondary-background my-10 text-center max-w-full mx-auto">
            <div className="flex justify-center mb-4">
              {/* The AlertTriangle is still appropriate for "No Pages Found" to indicate an unfulfilled state. */}
              <AlertTriangle className="text-yellow-500" size={36} />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No Pages Found
            </h3>

            <p className="text-base text-gray-700 dark:text-gray-300 mb-6">
              It looks like no pages are being monitored at the moment but
              getting started is easy. To begin tracking your website&apos;s
              performance and gain valuable insights, you can fetch pages from:
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
              <DrawerTrigger asChild>
                <button className="bg-orange-600 cursor-pointer hover:bg-orange-700 text-white font-semibold py-2 px-6 rounded-md transition-colors duration-150 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
                  Connect Google Search Console
                </button>
              </DrawerTrigger>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">
              This will help us gather data and provide detailed performance
              reports for your website.
            </p>
          </div>

          <DrawerContent style={{ borderRadius: 0, paddingTop: 0 }}>
            <div className="mx-auto h-[300px] w-full max-w-3xl">
              <DrawerHeader>
                <DrawerTitle className="text-xl mb-5 text-red-500">
                  Access Required
                </DrawerTitle>
                <DrawerDescription>
                  Connect to Google Search Console to fetch pages for analysis.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <button
                  onClick={fetchAuthUrl}
                  disabled={isConnecting}
                  className="flex items-center justify-center gap-2 border px-4 py-2 rounded-sm bg-gray-500/10 hover:bg-gray-500/20 dark:bg-secondary-background"
                >
                  {isConnecting ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    "Connect Google Search Console"
                  )}
                </button>
                <DrawerClose>
                  <div className="hover:cursor-pointer">Close</div>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      ) : urls?.length === 0 ? (
        <div className="mt-6 flex items-center justify-center text-muted-foreground">
          <LoadingAnimation />
        </div>
      ) : urls?.length > 0 && urls.length <= 10 ? (
        PageAddressOrganiser(urls, processedPages!)
      ) : (
        <></>
      )}
    </div>
  );
}
