"use client";

import React, { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import {
  Calendar,
  ChartColumn,
  GalleryThumbnails,
  Globe,
  Lightbulb,
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
import CountryTrafficMap from "./helpers/chart";
import GeoDistBars from "./helpers/geoDistBars";
import HappinessMap from "./helpers/happinessMap";
import { countryDistribution, overviewApi } from "./cf-apis/calls";
import TooltipIcon from "@/components/utils/customTooltip";

// LLM traffic breakdown by platform/tool
const llmPlatforms = [
  { platform: "ChatGPT", visitors: 278, avgSession: "4:05", br: 71 },
  { platform: "Perplexity", visitors: 125, avgSession: "3:12", br: 81 },
  { platform: "Gemini", visitors: 91, avgSession: "5:01", br: 86 },
  { platform: "Copilot", visitors: 67, avgSession: "2:30", br: 83 },
  { platform: "Other", visitors: 40, avgSession: "2:55", br: 89 },
];

// Top pages from LLM traffic
const llmTopPages = [
  { page: "/blog/ai-analytics", visitors: 201, bounce: "40%", conv: 12 },
  { page: "/features", visitors: 98, bounce: "28%", conv: 7 },
  { page: "/docs/api", visitors: 65, bounce: "34%", conv: 5 },
  { page: "/pricing", visitors: 38, bounce: "23%", conv: 2 },
];

type overvewMetrics = {
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
  } = useSiteContext();

  const [overvewMetrics, setOverviewMetrics] = useState<overvewMetrics[]>([]);
  const [happinessData, setHappinessData] = useState<any>([]);
  const [countryDist, setCountryDist] = useState<any>([]);
  const [totalMetricsOverview, setTotalMetricOverview] = useState<
    { label: string; value: string; change: string }[]
  >([]);
  const [combinedData, setCombinedData] = useState<any>({});
  const [selectedDevice, setSelectedDevice] = useState("All");

  useEffect(() => {
    fetchOverview();
    fetchCountryDistribution();
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

  if (totalMetricsOverview.length === 0 || overvewMetrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center md:gap-6">
          <div className="flex gap-2 items-center text-xl font-semibold text-primary italic border px-4 py-1 rounded-lg border-amber-300/20">
            <ChartColumn className="fill-amber-300 text-primary dark:text-primary/50" />
            <h1>Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <GalleryThumbnails className="text-primary/70 font-semibold" />
            <Select
              value={selectedDevice}
              onValueChange={(value) => setSelectedDevice(value)}
            >
              <SelectTrigger className="w-[180px] ring-0 border-[1px] border-primary/10 focus-visible:ring-0 focus-visible:border-primary/10">
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
            <span className="uppercase font-bold text-xs tracking-wider mb-1 text-primary/80">
              {stat.label}
            </span>
            <span className="text-3xl font-extrabold text-primary mb-1">
              {stat.value}
            </span>
            <span
              className={`text-sm ${
                stat.change.startsWith("+") ? "text-green-600" : "text-rose-600"
              } font-semibold`}
            >
              {stat.change}
            </span>
          </div>
        ))}
      </section>

      {/* Top Referals & regions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 my-10">
        <div className="col-span-1 bg-white dark:bg-secondary-background p-5 rounded-sm border-[1px] border-primary/20">
          Traffic Sources
        </div>
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

      {/* LLM Platform Table */}
      <section
        className={"bg-white rounded-2xl shadow p-6 mb-8 flex flex-col gap-4"}
      >
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          🤖 LLM Referral Breakdown
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 px-2 font-medium">Platform</th>
              <th className="py-2 px-2 font-medium">Visitors</th>
              <th className="py-2 px-2 font-medium">Avg Session</th>
              <th className="py-2 px-2 font-medium">Bounce Rate</th>
            </tr>
          </thead>
          <tbody>
            {llmPlatforms.map((row, idx) => (
              <tr
                key={row.platform}
                className={idx % 2 ? "bg-gray-50" : undefined}
              >
                <td className="py-2 px-2">{row.platform}</td>
                <td className="py-2 px-2">{row.visitors.toLocaleString()}</td>
                <td className="py-2 px-2">{row.avgSession}</td>
                <td className="py-2 px-2">{row.br}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Top pages for LLM */}
      <section
        className={"bg-white rounded-2xl shadow p-6 mb-8 flex flex-col gap-4"}
      >
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          📄 Top LLM Landing Pages
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 px-2 font-medium">Page</th>
              <th className="py-2 px-2 font-medium">Visitors</th>
              <th className="py-2 px-2 font-medium">Bounce Rate</th>
              <th className="py-2 px-2 font-medium">Conversions</th>
            </tr>
          </thead>
          <tbody>
            {llmTopPages.map((row, idx) => (
              <tr key={row.page} className={idx % 2 ? "bg-gray-50" : undefined}>
                <td className="py-2 px-2">{row.page}</td>
                <td className="py-2 px-2">{row.visitors.toLocaleString()}</td>
                <td className="py-2 px-2">{row.bounce}</td>
                <td className="py-2 px-2">{row.conv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

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

  function calculateOverviewStats(metrics: overvewMetrics[]) {
    let total_pageviews = 0;
    let total_sessions = 0;
    let total_bounce_rate = 0;
    let total_llm_traffic = 0;

    for (let i = 0; i < metrics.length; i++) {
      total_pageviews += metrics[i].total_pageviews;
      total_sessions += metrics[i].total_sessions;
      total_bounce_rate += metrics[i].bounce_rate * metrics[i].total_sessions;
      total_llm_traffic += metrics[i].llm_traffic;
    }

    const aggregate_bounce_rate =
      total_sessions > 0 ? total_bounce_rate / total_sessions : 0;

    const llm_traffic_percentage =
      total_pageviews > 0 ? (total_llm_traffic / total_pageviews) * 100 : 0;

    const stats = [
      {
        label: "Pageviews",
        value: total_pageviews.toLocaleString(),
        change: "+4%", // Placeholder
      },
      {
        label: "Sessions",
        value: total_sessions.toLocaleString(),
        change: "+1.7%", // Placeholder
      },
      {
        label: "Bounce Rate",
        value: `${aggregate_bounce_rate.toFixed(0)}%`,
        change: "−2%", // Placeholder
      },
      {
        label: "LLM Traffic",
        value: total_llm_traffic.toLocaleString(),
        change: "+12%", // Placeholder
      },
      {
        label: "LLM Traffic Percentage",
        value: `${llm_traffic_percentage.toFixed(1)}%`,
        change: "+1.2%", // Placeholder
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
}
