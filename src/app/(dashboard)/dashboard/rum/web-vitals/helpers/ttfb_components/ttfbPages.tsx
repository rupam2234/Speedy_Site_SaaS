"use client";

import { useMemo, useState } from "react";
import { Contributor, TTFBelementProps } from "../ttfb";
import TooltipIcon from "@/components/theme/customTooltip";

export default function TTFBPages({ contributors }: TTFBelementProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);

  const items_per_page = 10;

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

  const no_of_pages = Math.ceil(top_ttfb_pages.length / items_per_page);

  const currentItems = top_ttfb_pages.slice(
    (currentPage - 1) * items_per_page,
    currentPage * items_per_page,
  );

  return (
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
        {currentItems.length === 0 ? (
          <div className="px-3 py-2 text-xs text-primary/40">
            No slow pages detected
          </div>
        ) : (
          currentItems.map((x: any, index: number) => (
            <div key={x.page} className="flex items-center px-3 py-2 text-sm">
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

      <div className="p-4 flex items-center justify-end gap-4 text-xs">
        <button
          onClick={() => prevPage()}
          className="hover:bg-primary/10 cursor-pointer px-2 py-1 border border-primary/10 rounded-sm"
        >
          Previous
        </button>
        {currentPage} / {no_of_pages}
        <button
          onClick={() => nextPage()}
          className="hover:bg-primary/10 cursor-pointer px-2 py-1 border border-primary/10 rounded-sm"
        >
          Next
        </button>
      </div>
    </div>
  );

  function goToPage(page: number) {
    if (page < 1) {
      setCurrentPage(1);
    } else if (page > no_of_pages) {
      setCurrentPage(no_of_pages);
    } else {
      setCurrentPage(page);
    }
  }

  function nextPage() {
    goToPage(currentPage + 1);
  }

  function prevPage() {
    goToPage(currentPage - 1);
  }
}
