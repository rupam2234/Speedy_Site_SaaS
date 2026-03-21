"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  LoadingAnimation,
  PrimaryToolbar,
  CustomTooltip,
} from "@/components/theme";
import { InfoIcon } from "lucide-react";
import { useSiteContext } from "../../siteContext";
import { overviewApi, trafficSourceApi } from "./cf-apis/calls";
import { SourceHandler } from ".";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import { llm_sources } from "./traffic-sources/llmDomains";
import Image from "next/image";
import TooltipIcon from "@/components/theme/customTooltip";

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
  const [originalTrafficData, setOriginalTrafficData] = useState<any[]>([]);
  const [totalMetricsOverview, setTotalMetricOverview] = useState<
    { label: string; value: string; note: string | ReactNode }[]
  >([]);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    const keyPrefixs = ["traffic-sources", "analytics-overview"];

    // clean up previous caches
    keyPrefixs.forEach((x) =>
      cleanExpiredCache({ prefix: x, session_Storage: false }),
    );

    const cacheOverviewData = async () => {
      const key = `analytics-overview:${selectedSite}`;

      const { response } = await cachedData({
        fn: fetchOverview,
        key: key,
        session_Storage: false,
        ttl: 5 * 60 * 1000,
      });

      setOverviewMetrics(response);
    };

    const cacheTrafficSource = async () => {
      const key = `traffic-sources:${selectedSite}`;

      const { response } = await cachedData({
        fn: getTrafficSource,
        key: key,
        session_Storage: false,
        ttl: 5 * 60 * 1000,
      });

      setOriginalTrafficData(response || []);
    };

    // call both fetches
    cacheOverviewData();
    cacheTrafficSource();
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

      const filteredOriginalData =
        selectedDevice === "All"
          ? originalTrafficData
          : originalTrafficData.filter(
              (x) =>
                x.device_type.toLowerCase() === selectedDevice.toLowerCase(),
            );

      calculateOverviewStats(filteredMetrics, filteredOriginalData);
    }
  }, [overvewMetrics, originalTrafficData, selectedDevice]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <div className="px-5 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Simple Analytics
            </h2>
            <TooltipIcon
              content="By capturing user experience and page speed metrics, we can additionally gather privacy-focused page analytics data. This represents the minimal page analytics you need."
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
            Lightweight Analytics With LLM Source Tracking
          </p>
        </div>
      </div>
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

        <SourceHandler originalTrafficData={originalTrafficData} />
      </div>
    </>
  );

  /**
   *
   * @returns overview data of analytics page
   */
  async function fetchOverview() {
    const res: any = await overviewApi({
      startDate: startDate?.toISOString().split("T")[0] as string,
      endDate: endDate?.toISOString().split("T")[0] as string,
      domain: selectedSite,
    });

    if (!res) {
      throw new Error(res.message);
    }

    return res;
  }

  /**
   *
   * @returns traffic sources including device type and domain name
   */
  async function getTrafficSource() {
    if (!startDate || !endDate || !selectedSite) return;

    const data: any = await trafficSourceApi({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      domain: selectedSite,
      key: "secret_for_speedy_site",
    });

    return data;
  }

  function calculateOverviewStats(
    metrics: overviewMetrics[],
    originalTrafficData: any[],
  ) {
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

    const llmFiltered = originalTrafficData.filter((item: any) =>
      llm_sources.some((llm) =>
        item.referral_domain?.toLowerCase().includes(llm),
      ),
    );

    const llm_pageviews = llmFiltered.reduce(
      (acc, index) => acc + index.count,
      0,
    );

    const llm_traffic_percentage = (llm_pageviews / total_pageviews) * 100;

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
        label: "LLM Traffic %",
        value: llm_traffic_percentage.toFixed(2),
        note:
          llm_traffic_percentage > 2 ? (
            "At the age of GEO, driving a major share of traffic from LLM-powered discovery is crucial. This denotes your LLM traffic share for the selected website."
          ) : (
            <div className="space-y-3">
              <p>
                At the age of GEO, driving a major share of traffic from
                LLM-powered discovery is crucial. This denotes your LLM traffic
                share for the selected website.
              </p>
              <p>Low LLM traffic?</p>
              <button className="px-2 py-1 rounded-xs bg-green-500 text-primary font-semibold cursor-pointer hover:bg-green-400">
                Try our LLM citation tool
              </button>
              <Image
                alt="AI-citation-speedy-site"
                src={"/images/products/AI-citation-speedy-site.webp"}
                width={300}
                height={150}
                className="w-full h-auto"
              />
            </div>
          ),
      },
    ];

    setTotalMetricOverview(stats);
  }
}
