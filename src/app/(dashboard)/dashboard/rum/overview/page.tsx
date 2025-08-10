"use client";

import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { ChartNoAxesGantt } from "lucide-react";
import { AggregatedMetrics } from "../helpers/analyticsOverview";
import { DevicePerformanceData } from "../helpers/ai_citation";
import { useSiteContext } from "../../siteContext";
import RumDashboard, { WebVitalsMetric } from "../helpers/dashboard";
import { ExperienceData } from "../helpers/ExperienceBar";
import DashboardToolbar from "@/components/utils/toolbar";
import { Mixed_metric } from "../helpers/multiMetricChart";

type RawData = {
  device_type: "desktop" | "mobile" | "tablet" | "all";
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
  const [mixedMetric, setMixedMetric] = useState<Mixed_metric[]>([]);

  const controlledDateRange = "7days";
  const intDate = rumDateRange === "7days" ? 7 : 7; // default 7 days for mixed_metric

  useEffect(() => {
    if (!selectedSite) return;

    async function fetchAllData() {
      try {
        const [liveRes, mixedRes] = await Promise.all([
          fetch("/api/rum/dashboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain_name: selectedSite,
              date_range: controlledDateRange,
            }),
          }),
          // fetch("/api/rum/previous", {
          //   method: "POST",
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify({
          //     domain_name: selectedSite,
          //     date_range: controlledDateRange,
          //   }),
          // }),
          fetch("/api/rum/dashboard/mixed-metric", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain_name: selectedSite,
              date_range: intDate,
            }),
          }),
        ]);

        if (!liveRes.ok || !mixedRes.ok)
          throw new Error("Failed to fetch RUM data");

        const live = await liveRes.json();
        const mixed = await mixedRes.json();

        setDistData(live?.metrics?.webVitals || []);
        setHappinessData(live?.metrics?.userHappiness || []);
        setCitationData(live?.metrics?.ai_citation || []);
        setAnalyticsData(live?.metrics?.analytics || []);
        setMixedMetric(mixed?.metrics || []);
      } catch (error) {
        console.error("Error loading RUM data:", error);
        setDistData([]);
        setHappinessData([]);
        setCitationData([]);
        setAnalyticsData([]);
        setMixedMetric([]);
      }
    }

    fetchAllData();
  }, [selectedSite, rumDateRange]);

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
      grouped[device].unique_visitors += entry.unique_visitors;
      grouped[device].country.push(entry.country);
      grouped[device].bounce_rate_percentage +=
        entry.bounce_rate_percentage * entry.total_sessions;
    }

    for (const device in grouped) {
      const g = grouped[device];
      g.bounce_rate_percentage = parseFloat(
        (g.bounce_rate_percentage / g.total_sessions).toFixed(2)
      );
      g.avg_pages_per_session = parseFloat(
        (g.total_page_views / g.total_sessions).toFixed(2)
      );
      g.unique_languages = 1; // static fallback
    }

    return Object.values(grouped);
  }

  const metrics = aggregateByDeviceType(analyticsData);

  const selectedCitation = citationData.find(
    (x) => x.device_type === selectedDevice.toLowerCase()
  );
  const selectedAnalytics = metrics.find(
    (x) => x.device_type === selectedDevice.toLowerCase()
  );

  // Show loading until all required data is ready
  if (
    distdata.length === 0 ||
    happinessData.length === 0 ||
    citationData.length === 0 ||
    mixedMetric.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <DashboardToolbar />
      <div className="m-5">
        <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
          <span className="flex gap-2 items-center">
            <ChartNoAxesGantt
              size={30}
              className="fill-pink-600/30 text-primary/70 dark:text-accent/70"
            />
            <h2 className="text-md md:text-2xl font-bold text-primary/90">
              Weekly Overview
            </h2>
          </span>
        </div>

        <RumDashboard
          distData={distdata}
          experienceBarData={happinessData}
          citationData={selectedCitation}
          analyticsData={selectedAnalytics}
          mixed_metric={mixedMetric}
        />
      </div>
    </>
  );
}
