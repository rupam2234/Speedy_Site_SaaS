"use client";

import { useEffect, useState } from "react";
import {
  LoadingAnimation,
  PrimaryToolbar,
  CustomTooltip,
} from "@/components/theme";
import { InfoIcon } from "lucide-react";
import { useSiteContext } from "../../siteContext";
import { overviewApi } from "./cf-apis/calls";
import { SourceHandler } from ".";

type overviewMetrics = {
  date_collected: string;
  domain_name: string;
  device_type: string;
  total_pageviews: number;
  total_sessions: number;
  avg_pages_per_session: number;
  bounce_rate: number;
  llm_traffic: number;
  llm_traffic_percentage: number;
};

export default function Main() {
  const { selectedSite, selectedDevice, startDate, endDate } = useSiteContext();
  const [overvewMetrics, setOverviewMetrics] = useState<overviewMetrics[]>([]);
  const [totalMetricsOverview, setTotalMetricOverview] = useState<
    { label: string; value: string; note: string }[]
  >([]);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    fetchOverview();
  }, [selectedSite, startDate, endDate]);

  useEffect(() => {
    if (overvewMetrics.length) {
      const filteredMetrics =
        selectedDevice === "All"
          ? overvewMetrics
          : overvewMetrics.filter(
              (metric) =>
                metric.device_type.toLowerCase() ===
                selectedDevice.toLowerCase(),
            );
      calculateOverviewStats(filteredMetrics);
    }
  }, [overvewMetrics, selectedDevice]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <PrimaryToolbar enableAllDevices={true} isSticky />
      <div className="min-h-screen p-5">
        {/* Page View Section */}
        {overvewMetrics.length > 0 && totalMetricsOverview.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {totalMetricsOverview.map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-secondary-background rounded-lg shadow hover:shadow-lg px-6 py-5 flex flex-col items-center text-center"
              >
                <div className="uppercase flex items-center gap-1 font-bold text-xs tracking-wider mb-1 text-primary/80">
                  <span>{stat.label}</span>
                  <CustomTooltip
                    content={stat.note}
                    side="left"
                    trigger={
                      <InfoIcon
                        size={22}
                        className="text-primary/50 hover:bg-primary/10 hover:rounded-full p-1"
                      />
                    }
                    delay={300}
                  />
                </div>
                <span className="text-3xl font-extrabold text-primary mb-1">
                  {stat.value}
                </span>
              </div>
            ))}
          </section>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-secondary-background rounded-lg shadow px-6 py-5 flex flex-col items-center text-center"
              >
                <div className="h-5 w-24 bg-primary/20 rounded mb-2" />
                <div className="h-10 w-20 bg-primary/30 rounded" />
              </div>
            ))}
          </section>
        )}

        {/* Traffic View */}
        <SourceHandler />
      </div>
    </>
  );

  async function fetchOverview() {
    try {
      const res: any = await overviewApi({
        startDate: startDate?.toISOString().split("T")[0] as string,
        endDate: endDate?.toISOString().split("T")[0] as string,
        domain: selectedSite,
      });
      if (res && Array.isArray(res)) {
        setOverviewMetrics(res);
      }
    } catch (error: any) {
      console.error("Failed to fetch overview metrics:", error);
      setOverviewMetrics([]);
    }
  }

  function calculateOverviewStats(metrics: overviewMetrics[]) {
    let total_pageviews = 0;
    let total_sessions = 0;
    let total_bounce_rate = 0;

    for (let i = 0; i < metrics.length; i++) {
      total_pageviews += metrics[i].total_pageviews;
      total_sessions += metrics[i].total_sessions;
      total_bounce_rate += metrics[i].bounce_rate * metrics[i].total_sessions;
    }

    const aggregate_bounce_rate =
      total_sessions > 0 ? total_bounce_rate / total_sessions : 0;

    const avg_pageview_per_session =
      total_sessions > 0 && total_pageviews > 0
        ? total_pageviews / total_sessions
        : 0;

    const engagement_score =
      avg_pageview_per_session > 0
        ? (avg_pageview_per_session * (100 - aggregate_bounce_rate)) / 100
        : 0;

    const realistic_recovery_factor = 0.2; // 20% of bounce improvement is achievable
    const pages_lost_to_bounce =
      total_pageviews > 0 ? (aggregate_bounce_rate / 100) * total_pageviews : 0;

    const recoverable_pages = pages_lost_to_bounce * realistic_recovery_factor;

    const stats = [
      {
        label: "Pageviews",
        value: total_pageviews.toLocaleString(),
        note: "A pageview is counted every time a page on your website is loaded or reloaded",
      },
      {
        label: "Sessions",
        value: total_sessions.toLocaleString(),
        note: "Session gives you a single visit to your site by a user during which they may visit multiple pages and interect with your site",
      },
      {
        label: "Bounce Rate",
        value: `${aggregate_bounce_rate.toFixed(0)}%`,
        note: "It's the percentage of visitors who leaves your site after viewing just one page",
      },
      {
        label: "Pages per Session",
        value: avg_pageview_per_session.toFixed(2),
        note: "Page per session tells you on avearge how many pages a user visits during a single session on your site",
      },
      {
        label: "Engagement Score",
        value: engagement_score.toFixed(2),
        note: "The engagement score shows how much visitors actually stick around and explore your site. 0.1–0.3 is typical, and anything above 0.5 is strong engagement.",
      },
      {
        label: "Recoverable Pages (Bounce)",
        value: recoverable_pages.toFixed(0),
        note: "This gives a potential estimation on when engagement is increased and bounce rate is reduced by 20%, the pageviews that could be recovered.",
      },
    ];

    setTotalMetricOverview(stats);
  }
}
