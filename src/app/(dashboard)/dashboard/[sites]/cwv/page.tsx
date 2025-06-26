"use client";

import { useParams } from "next/navigation";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import { useEffect, useState } from "react";
import { fetchCrUXData } from "@/app/api/external/fetch_crux";
import { GalleryHorizontalEnd, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
// import { getRanges } from "./helper/referenceAreaHandler";
import ChartComponent from "./helper/cwvChart";
import { Helpers } from "./helper/helperFunc";
import { getColor } from "@/lib/cwv_helper/getColor";
import { cwv_metrics } from "./helper/cwvMetrics";
import DistributionChart from "./helper/distributionChart";

// class test
const helper = new Helpers();

export default function WebsitePage() {
  const params = useParams();
  const { sites } = params;
  const {
    selectedSite,
    setCruxData,
    cruxData,
    dailyCrux,
    selectedDevice,
    setDailyCrux,
    experienceType,
  } = useSiteContext();

  const [selectedMetric, setSelectedMetric] = useState<string>(
    "Largest Contentful Paint"
  );
  const [newMetricKey, setNewMetricKey] = useState<string>(
    "largest_contentful_paint"
  );
  const [acronym, setAcronym] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [latestMetric, setlatestMetric] = useState<number | string>(); // state for managing the latest metric data for daily card
  const [CruxChange, setCruxChange] = useState<number>(0);

  // set change of crux data and to previous crux data
  useEffect(() => {
    setCruxChange(
      helper.calculateChange(cruxData, selectedDevice, newMetricKey, dailyCrux)
    );
  }, [newMetricKey, dailyCrux, cruxData, selectedDevice]);

  // 1. Fetch data when selectedSite changes
  useEffect(() => {
    if (selectedSite) {
      fetchCrUXData(selectedSite, setCruxData);
      helper.getDailyCrux(selectedSite, setDailyCrux);
    }
  }, [selectedSite]);

  // 2. Calculate metric when data changes
  useEffect(() => {
    const metric = helper.getMetricValue(
      newMetricKey,
      selectedDevice,
      dailyCrux
    );
    setlatestMetric(metric !== null ? metric : 0);
  }, [dailyCrux, newMetricKey, selectedDevice]);

  useEffect(() => {
    const metricAcronym = cwv_metrics?.find((X) => X.label === selectedMetric);
    if (metricAcronym) {
      setAcronym(metricAcronym.acronym);
      setUnit(metricAcronym.unit);
    }
  }, [selectedMetric]);

  if (!selectedSite) {
    return (
      // instead I want to add a load animation here
      <div className="p-6 text-muted-foreground">
        Website &quot;{sites}&quot; not found.
      </div>
    );
  }

  function setMetricKey(newMetric: string) {
    setSelectedMetric(newMetric);
    const metricKey = cwv_metrics?.find((x) => x.label === newMetric);
    setNewMetricKey(metricKey ? metricKey.key : "");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Origin Web Vital Section */}
      <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
        <span className="flex gap-2 items-center">
          <GalleryHorizontalEnd
            size={30}
            className="fill-pink-600 dark:text-accent-foreground"
          />
          <h1 className="text-md md:text-2xl font-bold text-primary">
            Origin Web Vitals (Trend)
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon size={25} />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="w-[200px] md:w-[400px] text-[16px]"
            >
              This chart shows Core Web Vitals for your entire website
              (origin-level data), not a single page. It&apos;s based on real
              user experiences across all pages on your domain, grouped
              together. Use the metric selector on right to explore different
              metrics.
            </TooltipContent>
          </Tooltip>
        </span>
      </div>
      {/* Render charts and controls */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        <div className="col-span-1 order-2 md:order-1 overflow-hidden overflow-x-clip md:col-span-7 w-full border-gray-500/20 dark:bg-secondary-background bg-primary-foreground border rounded-sm px-4">
          {/* chart */}
          {experienceType === "p75" ? (
            <div className="relative w-full h-[400px]">
              <ChartComponent metric_key={newMetricKey} />
            </div>
          ) : (
            <div className="relative w-full h-[400px]">
              <DistributionChart metric_key={newMetricKey} />
            </div>
          )}
        </div>
        {/* controls */}
        <div className="col-span-1 space-y-7 order-1 md:order-2 md:col-span-3 w-full border-gray-500/20 dark:bg-secondary-background bg-primary-foreground border rounded-sm px-6 py-7">
          {/* metric controller */}
          <Select value={selectedMetric} onValueChange={setMetricKey}>
            <SelectTrigger className="flex justify-between items-center w-full dark:bg-secondary-background cursor-pointer dark:text-accent-foreground bg-gray-500/10 px-[12px] rounded-sm border-gray-500/20 ring-0 focus-visible:ring-0">
              {selectedMetric}
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {cwv_metrics?.map((item, index) => (
                  <SelectItem key={index} value={item.label}>
                    <div className="flex gap-3 items-center">
                      <span className="w-12 flex justify-center bg-primary/70 text-[12px] font-semibold text-primary-foreground rounded-[2px] px-2">
                        {item.acronym}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {/* active experience module */}
          <div>
            <ul className="space-y-1">
              {[
                {
                  label: "75th Percentile (ms)",
                  key: "p75",
                },
                {
                  label: "Distribution (density)",
                  key: "Distribution",
                },
              ].map(({ label, key }) => {
                const isActive = experienceType === key;
                return (
                  <li
                    key={key}
                    className={`flex gap-2 items-center ${
                      isActive ? "text-foreground" : "text-muted-foreground/80"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border ${
                        isActive
                          ? "border-accent-foreground bg-gray-500/10 dark:bg-secondary"
                          : "border-accent-foreground/50 bg-background dark:bg-transparent"
                      }`}
                    />
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
          {/* live metric card */}
          <div className="w-full space-y-3 p-3 md:text-md rounded-sm bg-gray-500/10 dark:bg-secondary">
            <Tooltip>
              <TooltipTrigger>
                <span className="flex gap-3 item-center cursor-help text-accent-foreground/80 dark:text-accent-foreground font-semibold">
                  <div className="relative flex items-center justify-center mt-1 w-4 h-4">
                    {/* Pulsing effect */}
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                    {/* Solid green dot */}
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <p>Live Trend</p>
                </span>
              </TooltipTrigger>
              <TooltipContent className="w-[200px] md:w-[400px] text-[16px]">
                Track daily data for the selected metric. You&apos;ll see
                today&apos;s value first, followed by the percentage change
                compared to the last reported value.
              </TooltipContent>
            </Tooltip>
            <div className="flex justify-between items-center">
              {/* Left side: Label and Metric */}
              <div className="flex items-center gap-2">
                <span>Today&apos;s {acronym} : </span>
                <span
                  className={`${getColor(
                    newMetricKey,
                    latestMetric as unknown as number
                  )} font-semibold`}
                >
                  {latestMetric} {unit}
                </span>
              </div>

              {/* Right side: p75 badge */}
              <span className="cursor-help dark:text-accent-foreground text-accent bg-primary/80 dark:bg-secondary-background px-2 py-1 text-[12px] rounded-sm">
                p75
              </span>
            </div>
            <div>
              Change:{" "}
              <span
                className={`${
                  CruxChange > 0 ? "text-red-500" : "text-green-500"
                } font-semibold`}
              >
                {" "}
                {CruxChange > 0
                  ? `+${CruxChange} %`
                  : CruxChange < 0
                  ? `${CruxChange} %`
                  : `${CruxChange} %`}
              </span>
            </div>
          </div>
          {/* color legend */}
          <div className="flex gap-2 items-center justify-around">
            {[
              { color: "bg-[#66cc8f]", label: "Good" },
              { color: "bg-[#FFEEA9]", label: "Okay" },
              { color: "bg-[#FF9898]", label: "Poor" },
            ].map((x, index) => {
              return (
                <div className="flex gap-2 items-center mt-3" key={index}>
                  <div className={`w-7 h-3 rounded-[2px] ${x.color}`} />
                  <p>{x.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Link to page groups */}
      <div className="relative group w-fit">
        {/* Main box */}
        <div className="w-[200px] h-auto border border-gray-500/20 dark:bg-secondary-background bg-primary-foreground px-4 py-2 flex items-center justify-between">
          <span>Page Groups</span>
          {/* Triangle */}
          <div className="ml-2 w-0 h-0 border-y-8 border-y-transparent border-l-[10px] border-l-gray-400 group-hover:rotate-90 transition-transform duration-300"></div>
        </div>

        {/* Tooltip or sliding explanation */}
        <div className=" absolute top-0 left-full ml-2 w-5xl bg-primary-foreground dark:bg-secondary-background text-sm text-gray-800 dark:text-white border border-gray-500/20 p-3 rounded shadow-md opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 z-10">
          This section shows how your pages are grouped based on performance or
          structure.
        </div>
      </div>
    </div>
  );
}
