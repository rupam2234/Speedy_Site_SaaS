"use client";

import TooltipIcon from "@/components/utils/customTooltip";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type Contributor = {
  browser: string;
  city: string;
  country: string;
  device_type: string;
  downlink: number;
  isp: string;
  network_type: string;
  os: string;
  page_path: string;
  region: string;
  rtt: number;
  timezone: string;
  ttfb_dns_lookup: number;
  ttfb_ms: number;
  ttfb_request_start: number;
  ttfb_response_start: number;
  ttfb_tcp_connection: number;
};

interface TTFBelementProps {
  contributors: Contributor[];
}

export default function TTFBelements({ contributors }: TTFBelementProps) {
  const [activeTabKey, setActiveTabKey] = useState<string | null>();

  const top_ttfb_pages = useMemo(() => {
    const seen: Record<string, number> = {};
    const tempSum: Record<string, Contributor & { count: number }> = {};
    const result: any[] = [];

    if (contributors.length === 0) return [];

    contributors.forEach((a) => {
      if (!tempSum[a.page_path]) {
        tempSum[a.page_path] = { ...a, count: 0 };
      }

      // Increment sums
      tempSum[a.page_path].ttfb_ms += a.ttfb_ms;
      tempSum[a.page_path].ttfb_dns_lookup += a.ttfb_dns_lookup;
      tempSum[a.page_path].ttfb_tcp_connection += a.ttfb_tcp_connection;
      tempSum[a.page_path].rtt += a.rtt;
      tempSum[a.page_path].downlink += a.downlink;
      tempSum[a.page_path].ttfb_request_start += a.ttfb_request_start;
      tempSum[a.page_path].ttfb_response_start += a.ttfb_response_start;
      tempSum[a.page_path].count += 1;

      // Track frequency
      seen[a.page_path] = (seen[a.page_path] || 0) + 1;
    });

    // Compute averages for pages with multiple occurrences
    Object.values(tempSum).forEach((data) => {
      if (data.count > 1) {
        result.push({
          page: data.page_path,
          ttfb_ms: data.ttfb_ms / data.count,
          ttfb_dns_lookup: data.ttfb_dns_lookup / data.count,
          ttfb_tcp_connection: data.ttfb_tcp_connection / data.count,
          rtt: data.rtt / data.count,
          downlink: data.downlink / data.count,
          ttfb_request_start: data.ttfb_request_start / data.count,
          ttfb_response_start: data.ttfb_response_start / data.count,
        });
      } else {
        result.push({
          page: data.page_path,
          ttfb_ms: data.ttfb_ms,
          ttfb_dns_lookup: data.ttfb_dns_lookup,
          ttfb_tcp_connection: data.ttfb_tcp_connection,
          rtt: data.rtt,
          downlink: data.downlink,
          ttfb_request_start: data.ttfb_request_start,
          ttfb_response_start: data.ttfb_response_start,
        });
      }
    });

    result.sort((a, b) => b.ttfb_ms - a.ttfb_ms);

    return result;
  }, [contributors]);

  console.log(top_ttfb_pages);

  return (
    <div className="border-t border-gray-200 dark:border-primary/10 pt-4 space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Major Contributors</p>
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => handleActiveTab("page_tab")}
        className="w-full flex items-center justify-between px-3 py-2 text-sm
               border border-gray-200 dark:border-primary/10 rounded-md
               hover:bg-gray-50 dark:hover:bg-primary/5 transition cursor-pointer"
      >
        <p className="font-medium text-primary/70">
          Pages with the highest Time to First Byte
        </p>
        <ChevronDown
          size={16}
          className={`text-primary/60 transition-transform ${
            activeTabKey === "page_tab" ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content */}
      {activeTabKey === "page_tab" && (
        <div className="rounded-md border border-gray-200 dark:border-primary/10 overflow-hidden">
          {/* Header Row */}
          <div
            className="flex items-center px-3 py-2 text-xs font-semibold
             bg-gray-50 dark:bg-primary/5
             text-primary/60 border-b border-gray-200 dark:border-primary/10"
          >
            <span className="w-5">#</span>
            <span className="flex-1 font-mono truncate">Page</span>

            <div className="w-20 text-center">
              <TooltipIcon
                content="Time taken to find server address."
                side="left"
                trigger={<span className="cursor-help">DNS</span>}
              />
            </div>

            <div className="w-24 text-center">
              <TooltipIcon
                content="Time needed to connect to the server."
                side="left"
                trigger={<span className="cursor-help">TCP</span>}
              />
            </div>

            <div className="w-20 text-center">
              <TooltipIcon
                content="Time for data to travel to the server and back."
                side="left"
                trigger={<span className="cursor-help">RTT</span>}
              />
            </div>

            <div className="w-24 text-center">
              <TooltipIcon
                content="Time the server takes to prepare the response."
                side="left"
                trigger={<span className="cursor-help">Req</span>}
              />
            </div>

            <div className="w-24 text-center">
              <TooltipIcon
                content="Total time until the first byte is received."
                side="left"
                trigger={<span className="cursor-help">Resp</span>}
              />
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-200 dark:divide-primary/10">
            {top_ttfb_pages.length === 0 ? (
              <div className="px-3 py-2 text-xs text-primary/40">
                No slow pages detected
              </div>
            ) : (
              top_ttfb_pages.map((x: any, index: number) => (
                <div
                  key={x.page}
                  className="flex items-center px-3 py-2 text-sm"
                >
                  <span className="w-5 text-primary/40">{index + 1}.</span>

                  <span className="flex-1 font-mono text-primary/80 truncate">
                    {x.page}
                  </span>

                  <span
                    className={`w-20 text-center text-xs font-medium ${
                      x.ttfb_dns_lookup > 150
                        ? "text-red-500"
                        : x.ttfb_dns_lookup > 100
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {Math.round(x.ttfb_dns_lookup)} ms
                  </span>

                  <span
                    className={`w-24 text-center text-xs font-medium ${
                      x.ttfb_tcp_connection > 400
                        ? "text-red-500"
                        : x.ttfb_tcp_connection > 200
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {Math.round(x.ttfb_tcp_connection)} ms
                  </span>

                  <span
                    className={`w-20 text-center text-xs font-medium ${
                      x.rtt > 200
                        ? "text-red-500"
                        : x.rtt > 100
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {Math.round(x.rtt)} ms
                  </span>

                  <span
                    className={`w-24 text-center text-xs font-medium ${
                      x.ttfb_request_start > 500
                        ? "text-red-500"
                        : x.ttfb_request_start > 200
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {Math.round(x.ttfb_request_start)} ms
                  </span>

                  <span
                    className={`w-24 text-center text-xs font-medium ${
                      x.ttfb_response_start > 1800
                        ? "text-red-500"
                        : x.ttfb_response_start > 800
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {Math.round(x.ttfb_response_start)} ms
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  function handleActiveTab(key: string) {
    if (key === activeTabKey) {
      setActiveTabKey(null);
    } else {
      setActiveTabKey(key);
    }
  }
}
