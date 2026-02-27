"use client";

import { CustomCalendar, CustomTooltip } from "@/components/theme";
import { useEffect, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { OriginHits } from "@/app/api/dataTypes";
import { OriginPerformanceChart, OriginStatsOverview } from ".";
import { InfoIcon, LoaderCircle } from "lucide-react";

export default function Main() {
  const { selectedSite, startDate, endDate } = useSiteContext();
  const [originHitData, setOriginHitData] = useState<OriginHits[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getOriginHits();
  }, [selectedSite, endDate, startDate]);

  return (
    <div className="p-4 space-y-6">
      <div
        className="flex justify-between flex-col md:flex-row w-full items-start md:items-center gap-3 bg-transparent relative"
        style={{ zIndex: 50, background: "inherit", top: 0 }}
      >
        <div className="flex items-center gap-1 w-full md:w-auto">
          <h2 className="font-semibold text-primary/80">Origin Hits</h2>
          <CustomTooltip
            content="Origin hits are requests that actually reach your web server instead of being served from a cache. Every origin hit uses server resources like CPU, memory, and bandwidth, which can slow down your site if there are too many. Using a server-side cache (like WP Rocket) reduces some origin hits for repeated visits, but a CDN takes it further by serving content from edge servers closer to users, lowering global server load and improving speed. So, a high origin hit percentage means your server is doing most of the work, while a low percentage shows caching and/or CDN is effectively handling requests."
            trigger={
              <InfoIcon
                size={22}
                className="rounded-full cursor-pointer p-1 text-primary/60 hover:bg-primary/10"
              />
            }
            side="right"
            maxWidth="500px"
          />
        </div>

        <CustomCalendar defaultDateRange={30} />
      </div>

      <OriginStatsOverview data={originHitData} isLoading={isLoading} />

      {/* --- Origin Server Hits Section --- */}
      <div className="relative">
        <div className="absolute left-0 right-0 w-full space-y-2">
          {originHitData.length === 0 ? (
            <div className="h-75 flex items-center justify-center mx-12.5 my-10 bg-primary/5 animate-pulse">
              <LoaderCircle
                size={30}
                className="animate-spin text-primary/20"
              />
            </div>
          ) : (
            <OriginPerformanceChart
              data={originHitData}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
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
