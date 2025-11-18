"use client";

import React, { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import {
  Calendar,
  ChartColumn,
  ChartPie,
  ChartScatter,
  GalleryThumbnails,
  Globe,
  Heart,
  InfoIcon,
  Lightbulb,
  Loader2Icon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteContext } from "../../siteContext";
import GeoDistBars from "./helpers/geoDistBars";
import { countryDistribution, overviewApi } from "./cf-apis/calls";
import TooltipIcon from "@/components/utils/customTooltip";
import TrafficSource from "./helpers/trafficSource";
import dynamic from "next/dynamic";
import WebVitalsOverview from "./helpers/webVitals";
import LLMTrafficSource from "./helpers/llmTrafficSource";
import { redirect } from "next/navigation";

const CountryTrafficMap = dynamic(
  () => import("./helpers/trafficMapContainer"),
  {
    ssr: false,
  }
);

const HappinessMap = dynamic(() => import("./helpers/happinessMap"), {
  ssr: false,
});

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

const deviceOptions = ["All", "Desktop", "Mobile", "Tablet"];

const dateRangeOptions = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7days" },
  { label: "30 Days", value: "30days" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Last 6 Months", value: "last6Months" },
  { label: "This Year", value: "year" },
];

export default function AnalyticsDashboard() {
  const {
    selectedSite,
    selectedGeoType,
    setSelectedGeoType,
    selectedAnalyticsDate,
    setSelectedAnalyticsDate,
    selectedDevice,
    setSelectedDevice,
    rumDistribution,
    setRumDistribution,
  } = useSiteContext();
  const [overvewMetrics, setOverviewMetrics] = useState<overviewMetrics[]>([]);
  const [happinessData, setHappinessData] = useState<any>([]);
  const [countryDist, setCountryDist] = useState<any>([]);
  const [totalMetricsOverview, setTotalMetricOverview] = useState<
    { label: string; value: string; note: string }[]
  >([]);
  const [combinedData, setCombinedData] = useState<any>({});
  const [activeSource, setActiveSource] = useState<
    "All Traffic" | "LLM Traffic"
  >("All Traffic");
  const [originalTrafficData, setOriginalTrafficData] = useState<any[]>([]);
  const [topLandingPages, setTopLandingPages] = useState<any[]>([]);
  const [current_page, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    fetchOverview();
    fetchCountryDistribution();
    fetchTrafficSourceData();
    setLoading(false);
  }, [selectedSite, selectedAnalyticsDate]);

  useEffect(() => {
    if (overvewMetrics.length) {
      const filteredMetrics =
        selectedDevice === "All"
          ? overvewMetrics
          : overvewMetrics.filter(
              (metric) =>
                metric.device_type.toLowerCase() ===
                selectedDevice.toLowerCase()
            );
      calculateOverviewStats(filteredMetrics);
    }
  }, [overvewMetrics, selectedDevice]);

  useEffect(() => {
    if (countryDist) {
      const newCombinedData = CountryDistributions(countryDist);
      setCombinedData(newCombinedData);
    }
  }, [countryDist, selectedDevice]);

  useEffect(() => {
    if (!selectedSite) return;
    const delay = 3000; // 3 sec
    const timer = setTimeout(() => {
      fetchUserHappinesGeo();
    }, delay);
    return () => clearTimeout(timer);
  }, [selectedSite]);

  const itemPerPage = 7;

  const total_pages =
    topLandingPages?.length > 0
      ? Math.ceil(topLandingPages.length / itemPerPage)
      : 1;

  const paginatedData =
    topLandingPages.length > itemPerPage
      ? topLandingPages.slice(
          (current_page - 1) * itemPerPage,
          itemPerPage * current_page
        )
      : topLandingPages;

  function goToPage(page: number) {
    if (page <= 1) {
      page = 1;
    }
    if (page > total_pages) page = total_pages;
    setCurrentPage(page);
  }

  if (totalMetricsOverview.length !== 0 || overvewMetrics.length !== 0) {
    return (
      <div className="min-h-screen p-5">
        {/* Header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex md:items-center md:flex-row md:gap-6 gap-2 flex-col">
            {/* Title */}
            <div className="flex gap-2 items-center text-xl font-semibold text-primary border px-4 py-1 rounded-lg border-amber-500/20">
              <ChartColumn className="fill-amber-300 text-primary dark:text-primary/50" />
              <h2>Overview</h2>
            </div>
            {/* Device selection */}
            <div className="flex items-center gap-2">
              <GalleryThumbnails className="text-primary/70 font-semibold" />
              <Select
                value={selectedDevice}
                onValueChange={(
                  value: "Desktop" | "Mobile" | "Tablet" | "All"
                ) => setSelectedDevice(value)}
              >
                <SelectTrigger className="w-[180px] cursor-pointer ring-0 border-[1px] border-primary/10 focus-visible:ring-0 focus-visible:border-primary/10">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent className="dark:bg-secondary-background">
                  <SelectGroup>
                    {deviceOptions.map((device) => (
                      <SelectItem key={device} value={device}>
                        {device}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {/* Distribution selection */}
            <div className="flex gap-2 items-center">
              <Select
                value={rumDistribution}
                onValueChange={setRumDistribution}
              >
                <SelectTrigger className="py-0 cursor-pointer border-[1px] border-primary/10 rounded-md shadow-2xs dark:bg-secondary-background hover:dark:bg-secondary-background">
                  <span className="text-primary flex gap-2 items-center font-medium text-[14px]">
                    <ChartScatter size={16} className="text-primary/80" />
                    {rumDistribution}
                  </span>
                </SelectTrigger>
                <SelectContent
                  className="min-w-[--radix-select-trigger-width] p-0 dark:bg-secondary-background"
                  side="bottom"
                  align="center"
                >
                  <SelectGroup>
                    {["p50", "p75", "p90", "p95", "p99"].map((x, index) => (
                      <SelectItem key={index} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <TooltipIcon
                content={
                  "Percentiles help normalize performance by showing real user experiences. P50 shows the median (typical) experience, P75 is used in Core Web Vitals to represent the majority of users, and higher percentiles like P90 or P99 highlight slower experiences at the tail end. These help uncover issues that averages or medians might miss."
                }
                maxWidth="16rem"
                side="bottom"
                trigger={
                  <InfoIcon
                    className="bg-transparent hover:bg-primary/5 text-primary/50 p-[2px] rounded-full"
                    size={22}
                  />
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-primary/70 font-semibold" size={20} />
            <Select
              value={selectedAnalyticsDate}
              onValueChange={(value) =>
                setSelectedAnalyticsDate(value as typeof selectedAnalyticsDate)
              }
            >
              <SelectTrigger className="w-[180px] ring-0 border-[1px] border-primary/10 focus-visible:ring-0 focus-visible:border-primary/10">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent className="dark:bg-secondary-background">
                <SelectGroup>
                  {dateRangeOptions.map(({ label, value }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {totalMetricsOverview.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-secondary-background rounded-lg shadow hover:shadow-lg px-6 py-5 flex flex-col items-center text-center"
            >
              <div className="uppercase flex items-center gap-1 font-bold text-xs tracking-wider mb-1 text-primary/80">
                {stat.label}{" "}
                <TooltipIcon
                  content={stat.note}
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
        {/* web vital overview section */}
        <section>
          <div className="font-semibold text-primary flex gap-2 items-center">
            <span>
              <Heart className="fill-pink-500 text-primary dark:text-primary-foreground" />
            </span>
            <h3 className="text-[19px]">Web Vitals (RUM)</h3>
            <TooltipIcon
              content={
                "This is not Google's core web vital data but real-time experience analysis of your site's traffic that closely resembles to CWV, to help you take decision and fix issues before they start appearing on Core Web Vital. (The data only includes from the past 7 days only and un-affected by the date setting at the top right)"
              }
              delay={300}
              side="bottom"
              trigger={<InfoIcon size={16} />}
            />
          </div>
          <WebVitalsOverview
            selectedSite={selectedSite}
            selectedDevice={selectedDevice}
            fixedDateRange={"7days"}
            rumDistribution={rumDistribution}
          />
        </section>
        {/* Top Referrals & regions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 mb-4">
          <div className="col-span-1 relative bg-white dark:bg-secondary-background p-5 rounded-sm border-[1px] border-primary/20">
            {/* Traffic Source */}
            <div className="flex gap-2 mb-[30px]">
              <span>
                <ChartPie className="text-primary dark:text-primary" />
              </span>
              <div className="flex items-center text-primary dark:text-primary font-semibold gap-2">
                <span>Traffic Sources</span>
              </div>
            </div>
            <div className="absolute top-5 right-5">
              {["All Traffic", "LLM Traffic"].map((x: string) => (
                <button
                  className={`mx-2 cursor-pointer hover:underline hover:underline-offset-4 hover:[text-decoration-color:#bdbdbe] ${
                    activeSource === x &&
                    `underline underline-offset-4 [text-decoration-color:#bdbdbe]`
                  }`}
                  onClick={() => handleActiveSource(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
            {activeSource === "All Traffic" ? (
              <TrafficSource
                activeDevice={selectedDevice}
                originalTrafficData={originalTrafficData}
              />
            ) : (
              <LLMTrafficSource
                activeDevice={selectedDevice}
                originalTrafficData={originalTrafficData}
              />
            )}
          </div>
          {/* Geo Distribution */}
          <div className="col-span-1 bg-white dark:bg-secondary-background p-5 rounded-sm border-[1px] border-primary/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary/80 flex gap-2 items-center">
                <span>
                  <Globe className="fill-blue-300 text-primary dark:text-primary-foreground" />
                </span>
                <div className="flex items-center gap-2">
                  <span>Geo Distribution</span>
                </div>
                {selectedGeoType === "User Happiness" ? (
                  <div className="">
                    <TooltipIcon
                      content={
                        "If your user happiness scores vary significantly across regions, it's a sign that performance isn't consistent worldwide. To address this, try our Global Performance Booster — a CDN wrapper designed to reduce regional latency and improve metrics like TTFB. You can find it in the left panel under Enhancements > Boost TTFB."
                      }
                      trigger={
                        <Lightbulb size={16} className="fill-yellow-200" />
                      }
                      delay={300}
                      side="bottom"
                    />
                  </div>
                ) : (
                  <></>
                )}
              </h3>
              <div className="flex gap-4 items-center">
                {["Visitors", "Share", "User Happiness"].map((x, index) => (
                  <button
                    key={index}
                    className={`bg-transparent hover:underline decoration-primary/30 underline-offset-4 cursor-pointer ${
                      selectedGeoType === x ? "underline" : ""
                    }`}
                    onClick={() => handleGeoType(x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
            <div className="py-8 h-[380px]">
              {selectedGeoType === "Visitors" ? (
                <CountryTrafficMap
                  trafficData={combinedData}
                  deviceType={
                    selectedDevice === "Desktop"
                      ? "desktop"
                      : selectedDevice === "Mobile"
                      ? "mobile"
                      : selectedDevice === "Tablet"
                      ? "tablet"
                      : "all"
                  }
                />
              ) : selectedGeoType === "Share" ? (
                <GeoDistBars
                  trafficData={combinedData}
                  deviceType={
                    selectedDevice === "Desktop"
                      ? "desktop"
                      : selectedDevice === "Mobile"
                      ? "mobile"
                      : selectedDevice === "Tablet"
                      ? "tablet"
                      : "all"
                  }
                />
              ) : (
                <HappinessMap
                  deviceType={
                    selectedDevice.toLowerCase() as unknown as
                      | "desktop"
                      | "mobile"
                      | "tablet"
                      | "all"
                  }
                  trafficData={happinessData.length > 0 ? happinessData : []}
                />
              )}
            </div>
          </div>
        </section>
        {/* Top pages for LLM */}
        <section
          className={
            "bg-white dark:bg-secondary-background rounded-sm border border-primary/20 p-6 mb-8 flex flex-col gap-4"
          }
        >
          <div className="flex md:flex-row justify-between items-center gap-2">
            <h2 className="text-xl font-semibold mb-3 text-primary">
              📄 Top Landing Pages (Weekly)
            </h2>
            <div
              className="hidden md:block bg-green-100 dark:bg-green-700 hover:text-black text-primary hover:bg-green-500/30 hover:dark:bg-green-100 rounded-sm dark:shadow-md shadow-sm px-2 py-1 cursor-pointer border-primary/60"
              onClick={() =>
                redirect(`/dashboard/rum/pages?site=${selectedSite}`)
              }
            >
              Group by performance
            </div>
          </div>
          {loading || topLandingPages.length === 0 ? (
            <div className="flex items-center justify-center h-auto">
              <Loader2Icon className="text-primary/50 animate-spin w-5 h-5" />
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 px-2 font-medium">Page</th>
                    <th className="py-2 px-2 font-medium">Source</th>
                    <th className="py-2 px-2 font-medium">Pageviews</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        idx % 2
                          ? "bg-primary-foreground dark:bg-secondary/20"
                          : undefined
                      }
                    >
                      <td className="py-2 px-2">
                        {row.current_page?.replace(/\/$/, "")}
                      </td>
                      <td className="py-2 px-2">
                        {row.previous_page?.replace(/\/$/, "")}
                      </td>
                      <td className="py-2 px-2">{row.hits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total_pages > 1 && (
                <div className="flex justify-end mt-4 space-x-2">
                  <button
                    className="px-3 py-[2px] border rounded disabled:opacity-50"
                    onClick={() => goToPage(current_page - 1)}
                    disabled={current_page === 1}
                  >
                    Previous
                  </button>

                  {Array.from({ length: total_pages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        className={`px-3 py-[2px] border rounded ${
                          current_page === page ? "bg-blue-500 text-white" : ""
                        }`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    className="px-3 py-[2px] border rounded disabled:opacity-50"
                    onClick={() => goToPage(current_page + 1)}
                    disabled={current_page === total_pages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  async function fetchOverview() {
    try {
      const res = await overviewApi({
        time_range: selectedAnalyticsDate,
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
  async function fetchCountryDistribution() {
    try {
      const res = await countryDistribution({
        time_range: selectedAnalyticsDate,
        domain: selectedSite,
      });
      if (res && Array.isArray(res)) {
        setCountryDist(res);
      }
    } catch (error) {
      console.error("Failed to fetch country traffic distribution:", error);
      setCountryDist([]);
    }
  }
  async function fetchUserHappinesGeo() {
    const start_date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/rum/analytics/happiness-geo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
      body: JSON.stringify({
        domain: selectedSite,
        start_date: start_date,
        end_date: today,
      }),
    });
    if (!res.ok) {
      console.error(res.statusText);
      setHappinessData([]);
    }
    const data: any = await res.json();
    setHappinessData(data.data);
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
  function CountryDistributions(data: any[]) {
    if (Array.isArray(data)) {
      const combinedCountryDistribution: { [key: string]: number } = {};
      const deviceTypeCountryDistributions: {
        [key: string]: { [key: string]: number };
      } = {};
      data.forEach((entry) => {
        try {
          const countryDistribution = JSON.parse(entry.country_distribution);
          deviceTypeCountryDistributions[entry.device_type] =
            deviceTypeCountryDistributions[entry.device_type] || {};
          Object.keys(countryDistribution).forEach((country) => {
            combinedCountryDistribution[country] =
              (combinedCountryDistribution[country] || 0) +
              countryDistribution[country];
            deviceTypeCountryDistributions[entry.device_type][country] =
              (deviceTypeCountryDistributions[entry.device_type][country] ||
                0) + countryDistribution[country];
          });
        } catch (error) {
          console.error(
            "Failed to parse country_distribution for device_type",
            entry.device_type,
            error
          );
        }
      });
      const combinedData = {
        device_type: "all",
        country_distribution: JSON.stringify(combinedCountryDistribution),
      };
      const newArray = [
        ...Object.keys(deviceTypeCountryDistributions).map((deviceType) => {
          return {
            device_type: deviceType,
            country_distribution: JSON.stringify(
              deviceTypeCountryDistributions[deviceType]
            ),
          };
        }),
        combinedData,
      ];
      return newArray;
    }
    return data;
  }
  function handleGeoType(active: string) {
    setSelectedGeoType(active as "Visitors" | "Share" | "User Happiness");
  }
  function handleActiveSource(source: string) {
    setActiveSource(source as "All Traffic" | "LLM Traffic");
  }
  async function getTrafficSource() {
    const res = await fetch("/api/rum/analytics/traffic-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        range: selectedAnalyticsDate,
        domain: selectedSite,
        key: "secret_for_speedy_site",
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch traffic source data");
    }

    return res.json();
  }
  async function fetchTrafficSourceData() {
    try {
      const data: any = await getTrafficSource();
      setOriginalTrafficData(data);
      const landingPageData: any = await getTopLandingPage();
      setTopLandingPages(landingPageData);
    } catch (err) {
      console.error("Error fetching traffic or landing page data:", err);
      setOriginalTrafficData([]);
      setTopLandingPages([]);
    }
  }
  async function getTopLandingPage() {
    const date =
      selectedAnalyticsDate === "today"
        ? "today"
        : selectedAnalyticsDate === "yesterday"
        ? "yesterday"
        : selectedAnalyticsDate === "last7days"
        ? "last_7_days"
        : "last_7_days";

    const res = await fetch("/api/rum/analytics/landing-pages", {
      method: "POST",
      body: JSON.stringify({ dateRange: date, domain: selectedSite }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch top landing pages");
    }

    return res.json();
  }
}
