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
import { Checkbox } from "@/components/ui/checkbox";

export default function PageGroups() {
  const [isConnecting, setConnecting] = useState(false);
  const { selectedSite, orders, selectedDevice } = useSiteContext();
  const { user } = useClerk();
  const [hasPages, setPages] = useState<Array<{ [key: string]: any }>>();
  const [, setJobProcessing] = useState<boolean>(false);
  const [pagesProcessing, setPagesProcessing] = useState<boolean>(false);
  const [processedPages, setProcessedPages] = useState<PageCrux[] | null>();
  const [urls, setUrls] = useState<string[] | null>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

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

    const pages = hasPages.map((x) => x.url);
    setJobProcessing(true);
    setPagesProcessing(true);

    fetch("/api/jobs/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pages),
    })
      .then((res) => res.json())
      .then(() => fetch("/api/jobs/process", { method: "POST" }))
      .then((res) => res.json())
      .catch(console.error)
      .finally(() => {
        setJobProcessing(false);
        // Give backend time to process
        setTimeout(() => setPagesProcessing(false), 20000);
      });
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
        setUrls(json.data[0]?.urls);
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

  function handlePageDelete() {
    if (!processedPages || !urls) return;

    // Remove pages with addresses in selectedUrls
    const updatedPages = urls.filter((page) => !selectedUrls.includes(page));

    // setProcessedPages(updatedResult);
    setUrls(updatedPages);
    setSelectedUrls([]);
    setIsConfirmingDelete(false);

    fetch("/api/pages/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: selectedSite,
        urls: selectedUrls,
      }),
    }).catch(console.error);
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
        return segments[0] || "";
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
            {selectedUrls.length > 0 && (
              <div className="relative ml-[-3px]">
                {!isConfirmingDelete ? (
                  <button
                    title="Delete pages"
                    className="dark:bg-secondary-background hover:bg-gray-200/40 bg-background p-1 rounded-sm cursor-pointer border text-primary"
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <div className="absolute mt-[-15px] text-sm left-0 top-0 bg-white dark:bg-secondary-background rounded-sm flex gap-2 items-center">
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
                  <button
                    title="Expand"
                    className="p-1 rounded-sm bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Expand size={16} />
                  </button>
                  <button
                    title="Report Bug"
                    className="p-1 rounded-sm bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Bug size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex justify-between items-center gap-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Group
            size={30}
            className="fill-blue-400 dark:text-accent-foreground"
          />
          <h2 className="text-md md:text-2xl font-bold text-primary">
            Page Groups
          </h2>
        </div>

        <span className="relative group">
          {processedPages === undefined ? (
            <Tooltip>
              <TooltipTrigger>
                <LoaderIcon size={24} className="animate-spin" />
              </TooltipTrigger>
              <TooltipContent side="left">Checking...</TooltipContent>
            </Tooltip>
          ) : processedPages !== null ? (
            <Tooltip>
              <TooltipTrigger>
                <CircleCheck size={26} className="text-green-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left">
                You have synced pages from GSC ✓
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </span>
      </div>

      {/* Main display logic */}
      {urls === undefined ? (
        <div className="p-6 border rounded-sm bg-gray-100 dark:bg-secondary-background text-center">
          <AlertTriangle className="text-yellow-500 mx-auto" size={32} />
          <h3 className="font-semibold text-lg">No Pages Found</h3>
          <p className="text-sm text-muted-foreground">
            Fetch from{" "}
            <Drawer>
              <DrawerTrigger asChild>
                <span className="text-orange-500 underline hover:cursor-pointer">
                  Google Search Console
                </span>
              </DrawerTrigger>{" "}
              or manually add pages to monitor.
            </Drawer>
          </p>
        </div>
      ) : urls!.length === 0 ? (
        <div className="mt-6 flex items-center justify-center text-muted-foreground">
          <LoaderIcon className="animate-spin inline-block mr-2" />
          Checking pages...
        </div>
      ) : urls!.length > 0 ? (
        PageAddressOrganiser(urls, processedPages!)
      ) : hasPages && pagesProcessing ? (
        <div className="mt-6 flex items-center justify-center text-muted-foreground">
          <LoaderIcon className="animate-spin inline-block mr-2" />
          Processing pages for Core Web Vitals. This process requires at least
          60 seconds to complete.
        </div>
      ) : (
        <Drawer>
          <DrawerContent style={{ borderRadius: 0, paddingTop: 0 }}>
            <div className="mx-auto h-[300px] w-full max-w-3xl">
              <DrawerHeader>
                {hasPages ? (
                  <>
                    <DrawerTitle className="text-xl mb-5 text-green-500">
                      Pages Acquired.
                    </DrawerTitle>
                    <DrawerDescription>
                      Pages are being processed. You can now close this drawer.
                    </DrawerDescription>
                  </>
                ) : (
                  <>
                    <DrawerTitle className="text-xl mb-5 text-red-500">
                      Access Required
                    </DrawerTitle>
                    <DrawerDescription>
                      Connect to Google Search Console to fetch pages for
                      analysis.
                    </DrawerDescription>
                  </>
                )}
              </DrawerHeader>
              <DrawerFooter>
                {!hasPages && (
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
                )}
                <DrawerClose>
                  <div className="hover:cursor-pointer">Close</div>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
