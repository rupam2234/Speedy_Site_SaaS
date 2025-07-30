"use client";

import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { ChartNoAxesGantt } from "lucide-react";
import { AggregatedMetrics } from "../helpers/analyticsOverview";
import { DevicePerformanceData } from "../helpers/ai_citation";
import { useSiteContext } from "../../siteContext";
import RumDashboard, { WebVitalsMetric } from "../helpers/dashboard";
import { ExperienceData } from "../helpers/ExperienceBar";

type RawData = {
  device_type: "desktop" | "mobile";
  country: string;
  total_page_views: number;
  total_sessions: number;
  unique_visitors: number;
  unique_languages: number;
  bounce_rate_percentage: number;
  avg_pages_per_session: number;
};

export default function RUM() {
  const { selectedSite, selectedDevice, rumDateRange } = useSiteContext();
  const [distdata, setDistData] = useState<WebVitalsMetric[]>([]);
  const [happinessData, setHappinessData] = useState<ExperienceData[]>([]);
  const [citationData, setCitationData] = useState<DevicePerformanceData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<RawData[]>([]);

  useEffect(() => {
    if (!selectedSite) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const endpoints = [
      { url: "/api/rum/percentile", setter: setDistData },
      { url: "/api/rum/happiness", setter: setHappinessData },
      { url: "/api/rum/ai-citation", setter: setCitationData },
      { url: "/api/rum/analytics-overview", setter: setAnalyticsData },
    ];

    Promise.all(
      endpoints.map(({ url, setter }) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            domain_name: selectedSite,
            date_range: rumDateRange,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => setter(data?.metrics || []))
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.error(`Error fetching ${url}:`, err);
              setter([]);
            }
          })
      )
    );

    return () => controller.abort();
  }, [selectedSite, rumDateRange]);

  const metrics = aggregateByDeviceType(analyticsData);

  function aggregateByDeviceType(data: RawData[]): AggregatedMetrics[] {
    const grouped: Record<string, AggregatedMetrics> = {};

    for (const entry of data) {
      const device = entry.device_type;
      if (!grouped[device]) {
        grouped[device] = {
          device_type: device,
          country: [],
          total_page_views: 0,
          total_sessions: 0,
          unique_visitors: 0,
          unique_languages: 0,
          bounce_rate_percentage: 0,
          avg_pages_per_session: 0,
        };
      }

      grouped[device].total_page_views += entry.total_page_views;
      grouped[device].total_sessions += entry.total_sessions;
      grouped[device].country.push(entry.country);
      grouped[device].unique_visitors += entry.unique_visitors;

      // We'll assume unique_languages is the same across the group (usually 1)
      grouped[device].unique_languages = 1;

      // Weighted sum of bounce rate
      grouped[device].bounce_rate_percentage +=
        entry.bounce_rate_percentage * entry.total_sessions;
    }

    // Final calculations
    for (const device in grouped) {
      const g = grouped[device];
      g.bounce_rate_percentage = parseFloat(
        (g.bounce_rate_percentage / g.total_sessions).toFixed(2)
      );
      g.avg_pages_per_session = parseFloat(
        (g.total_page_views / g.total_sessions).toFixed(2)
      );
    }

    return Object.values(grouped);
  }

  if (
    distdata.length == 0 ||
    happinessData.length == 0 ||
    citationData.length == 0
  ) {
    return (
      <div className="flex items-center justify-center md:mt-[-100px] min-h-full">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="m-5">
      {selectedSite ? (
        <>
          <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
            <span className="flex gap-2 items-center">
              <ChartNoAxesGantt
                size={30}
                className="fill-pink-600/30 text-primary/70 dark:text-accent/70"
              />
              <h2 className="text-md md:text-2xl font-bold text-primary/90">
                Overview
              </h2>
            </span>
            <span className="flex gap-3 item-center cursor-help text-accent-foreground/80 dark:text-accent-foreground font-semibold">
              <div className="relative flex items-center justify-center mt-1 w-4 h-4">
                {/* Pulsing effect */}
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                {/* Solid green dot */}
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <p>Live Data</p>
            </span>
          </div>
          <RumDashboard
            distData={distdata}
            experienceBarData={happinessData}
            citationData={
              selectedDevice === "Desktop" ? citationData[0] : citationData[1]
            }
            analyticsData={
              selectedDevice === "Desktop" ? metrics[0] : metrics[1]
            }
          />
        </>
      ) : (
        <p className="text-center text-gray-500">No site selected.</p>
      )}
    </div>
  );
}
