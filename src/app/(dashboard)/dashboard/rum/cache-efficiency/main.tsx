"use client";

import { CustomCalendar, LoadingAnimation } from "@/components/theme";
import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { CacheEfficiency } from "@/app/api/dataTypes";
import { OriginPerformanceChart, OriginStatsOverview } from ".";
import { InfoIcon, LoaderCircle } from "lucide-react";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import TooltipIcon from "@/components/theme/customTooltip";

export default function Main() {
  const { selectedSite, startDate, endDate } = useSiteContext();
  const [originHitData, setOriginHitData] = useState<CacheEfficiency[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cachedOriginHits();
  }, [selectedSite, endDate, startDate]);

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
        className={`flex px-4 py-3 justify-between flex-col md:flex-row w-full items-start backdrop-blur-sm md:items-center gap-4 relative`}
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                Cache Efficiency
              </h2>
              <TooltipIcon
                content="Cache efficiency shows how many requests are served from cache instead of your origin server. Requests hitting the server use CPU, memory, and bandwidth, which can slow your site if too frequent. CDNs greatly reduces this load by serving content from edge locations. A high origin hit rate means more server load, while a low rate means most of the requests are being served from edge cache."
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
              Server Load / CDN EFFICIENCY ANALYTICS
            </p>
          </div>
        </div>

        <CustomCalendar defaultDateRange={30} limited={30} />
      </div>

      <div className="p-4 mb-10 space-y-6">
        <OriginStatsOverview data={originHitData} isLoading={isLoading} />

        {/* --- Origin Server Hits Section --- */}
        <div className="relative ">
          <div className="absolute left-0 right-0 w-full space-y-2">
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
        fn: fetchOriginHits,
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
   * @returns origin hit data for active site
   */
  async function fetchOriginHits() {
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
  }
}
