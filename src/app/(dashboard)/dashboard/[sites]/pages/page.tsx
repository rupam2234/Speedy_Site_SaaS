"use client";

import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Layers, Loader, LoaderIcon, SquarePlus, Trash2 } from "lucide-react";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { useClerk } from "@clerk/nextjs";
import { PageCrux } from "@/data/cruxData";
import { getRanges } from "../cwv/helper/referenceAreaHandler";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import LabView from "./helper/lab";
import { pageMetricCache } from "@/components/globalData/cachedPageData";
import { useRouter } from "next/navigation";
import { useCheckPlan } from "@/components/utils/useCheckPlan";
import { PlanValidation } from "@/components/utils/activePlanValidation";

export default function PageGroups() {
  const [isConnecting, setConnecting] = useState(false);
  const { selectedSite, orders, selectedDevice, activePlan } = useSiteContext();
  const { user } = useClerk();
  const [hasPages, setPages] = useState<Array<{ [key: string]: any }>>();
  const [, setJobProcessing] = useState<boolean>(false);
  const [pagesProcessing, setPagesProcessing] = useState<boolean>(false);
  const [processedPages, setProcessedPages] = useState<PageCrux[] | null>();
  const [urls, setUrls] = useState<string[] | null>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [expandedType, setExpanded] = useState<null | {
    path: string;
    type: "lab" | "todo";
  }>(null);
  const [showNoPagesFallback, setShowNoPagesFallback] = useState(false);
  const [planChecked, setPlanChecked] = useState(false);
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  PlanValidation(); // redirect to billing if no active plan

  useCheckPlan();
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

  useEffect(() => {
    if (!activePlan) return;

    const planStatus = activePlan === "basic_plan" || activePlan === "pro";
    setHasPlan(planStatus);
    setPlanChecked(true);
  }, [activePlan]);

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
                    onCheckedChange={(checked: any) =>
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
                  onCheckedChange={(checked: any) =>
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

  if (!planChecked) {
    // load nothing
    return <></>;
  }

  if (!hasPlan) {
    return (
      <div className="flex flex-col items-center justify-center md:mt-[-150px] min-h-screen p-6">
        <span className="text-4xl mb-4">🔒</span>
        <h2 className="text-[16px] font-normal text-center text-primary">
          You at least need the basic plan to use daily lab report.
        </h2>
        <p>
          Please visit account {">"} billing to check your active subscription
          plan.
        </p>
      </div>
    );
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
          <TooltipContent side="right">
            Page Groups help you identify key performance bottlenecks by
            combining lab tests with real-world Web Vitals data.
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
                className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border ${
                  processedPages === null
                    ? "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300"
                    : "bg-gray-100 border-gray-300 text-gray-800 dark:bg-secondary-background dark:border-gray-700 dark:text-gray-200"
                } cursor-help`}
              >
                {urls?.length ?? 0 <= 10 ? (
                  <span>{urls?.length}/10 Pages</span>
                ) : (
                  <span>0/10 Pages</span>
                )}
                <TooltipTrigger>
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
        <div className="max-w-2xl mx-auto mt-24 p-8 border border-border dark:border-gray-700 rounded-md bg-white dark:bg-secondary-background shadow-sm text-center space-y-6">
          <h2 className="text-muted-foreground font-semibold text-base">
            You have not assigned any page to monitor yet.
          </h2>

          <p className="text-muted-foreground text-base">
            To start tracking, connect Google Search Console and select your
            website. Speedy Sense will automatically fetch the pages that
            contribute most to your site&apos;s Web Vitals.
          </p>

          {/* Button group with alignment */}
          <div className="flex flex-wrap justify-center gap-3 items-center">
            <button
              onClick={fetchAuthUrl}
              disabled={isConnecting}
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-md transition-colors duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              {isConnecting ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Connecting...
                </>
              ) : (
                "Connect Google Search Console"
              )}
            </button>

            <button
              onClick={handleManualPageAdd}
              className="inline-flex items-center justify-center gap-2 border border-input dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium text-primary px-4 py-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Assign Pages Manually
            </button>
          </div>

          <p className="text-[14px] text-muted-foreground">
            We will run scheduled tests on your pages daily. Keeping your
            assigned pages consistent ensures test history continuity.
          </p>
        </div>
      ) : urls?.length === 0 ? (
        <div className="flex items-center min-h-screen md:mt-[-200px] justify-center text-muted-foreground">
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
