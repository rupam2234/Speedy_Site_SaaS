"use client";

import { CustomCalendar, LoadingAnimation } from "@/components/theme";
import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { CacheEfficiency } from "@/app/api/dataTypes";
import { OriginPerformanceChart, OriginStatsOverview } from ".";
import { InfoIcon, LoaderCircle } from "lucide-react";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import TooltipIcon from "@/components/theme/customTooltip";
import CacheAnalysisForensics from "./log";

export default function Main() {
  const { selectedSite, startDate, endDate } = useSiteContext();
  const [originHitData, setOriginHitData] = useState<CacheEfficiency[]>([]);
  const [cacheAnalysis, setCacheAnalysis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // first clear expired cache
    ["origin-hits", "cache-analysis"].forEach((x) =>
      cleanExpiredCache({ prefix: x, session_Storage: false }),
    );

    // then get data as cached or fresh
    cachedOriginHits();
  }, [selectedSite, endDate, startDate]);

  useEffect(() => {
    // then get data as cached or fresh
    cachedEfficiencyAnalysis();
  }, [selectedSite]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <div
        ref={headerRef}
        className={`flex px-5 py-3 justify-between flex-col md:flex-row w-full items-start backdrop-blur-sm md:items-center gap-4 relative`}
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                Cache Efficiency
              </h2>
              <TooltipIcon
                content={
                  <div className="space-y-3">
                    <p>
                      Use this to understand how many requests are being served
                      from CDN (if you have any) instead of the origin server.
                      Requests hitting the server uses CPU, memory, and
                      bandwidth. CDNs greatly reduces this load by serving
                      content from edge locations.
                    </p>
                    <p>
                      Your origin server may perform well for nearby regions,
                      but users farther away can experience slower load times. A
                      CDN helps improve global performance and user experience
                      by distributing content across geographically closer edge
                      nodes.
                    </p>
                    <p>
                      To analyze page-level TTFB across different devices and
                      network conditions, refer to the TTFB section under RUM
                      Web Vitals.
                    </p>
                  </div>
                }
                trigger={
                  <InfoIcon
                    size={18}
                    className="rounded-full cursor-pointer text-primary/30 hover:text-primary transition-colors"
                  />
                }
                side="right"
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-70">
              User Requests to Your Server/CDN?
            </p>
          </div>
        </div>

        <CustomCalendar defaultDateRange={30} limited={30} />
      </div>

      <div className="p-4 grid grid-cols-7 gap-2">
        <div className="col-span-2">
          <OriginStatsOverview data={originHitData} isLoading={isLoading} />
        </div>

        <div className="col-span-5">
          {originHitData.length === 0 ? (
            <div className="h-75 flex items-center justify-center mx-12.5 my-10 bg-primary/5 animate-pulse">
              <LoaderCircle
                size={30}
                className="animate-spin text-primary/20"
              />
            </div>
          ) : (
            <OriginPerformanceChart data={originHitData} />
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold uppercase text-primary/80 text-[12px] py-2">
          Recent Logs
        </h3>
        <CacheAnalysisForensics data={cacheAnalysis} />
      </div>
    </>
  );

  /**
   * get cached origin hits per website
   */
  async function cachedOriginHits() {
    if (!selectedSite || !startDate || !endDate) return;

    const s = startDate.toISOString().split("T")[0];
    const e = endDate.toISOString().split("T")[0];

    const key = `origin-hits:${selectedSite}-${s}-${e}`;

    setIsLoading(true);

    try {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/server-hits/get", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              domain: selectedSite,
              startDate: startDate,
              endDate: endDate,
            }),
          });

          const body: any = await res.json();

          if (!res.ok) {
            throw new Error(body.message);
          }

          return body.data;
        },
        key,
        session_Storage: false,
        ttl: 5 * 60 * 1000,
      });

      setOriginHitData(response);
    } catch (err) {
      console.error("Failed to fetch origin hits:", err);

      // optional: reset data or show fallback
      setOriginHitData([]);
    } finally {
      setIsLoading(false);
    }

    cleanExpiredCache({ prefix: "origin-hits", session_Storage: false });
  }

  /**
   *
   * @returns cached version of cache efficiency analysis
   */
  async function cachedEfficiencyAnalysis() {
    if (!selectedSite) return;

    const key = `cache-analysis:${selectedSite}`;

    const { response } = await cachedData({
      fn: async () => {
        const res = await fetch("/api/server-hits/cache-analysis", {
          method: "POSt",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: selectedSite }),
        });

        const body: any = await res.json();

        if (!res.ok)
          throw new Error(body.message ?? "Failed to fetch cache analysis");

        return body.data;
      },
      key: key,
      session_Storage: false,
      ttl: 5 * 60 * 1000,
    });

    if (response) setCacheAnalysis(response);
  }
}
