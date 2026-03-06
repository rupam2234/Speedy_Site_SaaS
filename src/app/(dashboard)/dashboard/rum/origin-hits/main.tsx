"use client";

import { CustomCalendar, CustomTooltip } from "@/components/theme";
import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { OriginHits } from "@/app/api/dataTypes";
import { OriginPerformanceChart, OriginStatsOverview } from ".";
import { InfoIcon, LoaderCircle } from "lucide-react";

export default function Main() {
  const { selectedSite, startDate, endDate } = useSiteContext();
  const [originHitData, setOriginHitData] = useState<OriginHits[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getOriginHits();
  }, [selectedSite, endDate, startDate]);

  if (!selectedSite) {
    return (
      <div className="flex items-center w-full min-h-[calc(100lvh-100px)] justify-center">
        <LoaderCircle size={45} className="text-primary/10 animate-spin" />
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
          {/* --- CUSTOM SVG ICON --- */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />

              <circle
                cx="18"
                cy="18"
                r="2"
                fill="currentColor"
                className="animate-pulse"
              />
            </svg>
            {/* Decorative Background Glow */}
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full -z-10 opacity-50" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xl tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Origin Hits
              </h2>
              <CustomTooltip
                content="Origin hits are requests that reach your web server instead of being served from cache. They use server resources (CPU, memory, bandwidth) and can slow your site if too high. Server-side caching (e.g., WP Rocket) reduces repeat hits, while a CDN serves content from edge servers to lower server load and improve speed. A high origin hit rate means your server handles most requests; a low rate means caching/CDN is working effectively."
                trigger={
                  <InfoIcon
                    size={18}
                    className="rounded-full cursor-pointer text-primary/40 hover:text-primary/80 transition-colors"
                  />
                }
                side="right"
                maxWidth="400px"
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Server Load / CDN EFFICIENCY ANALYTICS
            </p>
          </div>
        </div>

        <CustomCalendar defaultDateRange={30} limited={30} />
      </div>

      <div className="p-4 space-y-6">
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
   * get origin hits per website
   */
  async function getOriginHits() {
    if (!selectedSite || !startDate || !endDate) return;

    setIsLoading(true);
    try {
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
        setOriginHitData([]);
        throw new Error(body.message);
      }

      setOriginHitData(body.data || []);
    } catch (error) {
      console.error(error);
      setOriginHitData([]);
    } finally {
      setIsLoading(false);
    }
  }
}
