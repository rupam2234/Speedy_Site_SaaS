"use client";

import { useParams } from "next/navigation";
import { useSiteContext } from "@/app/(dashboard)/siteContext";
import { useEffect, useState } from "react";
import { fetchCrUXData } from "@/app/api/external/fetch_crux";
import { FlaskRound, GalleryHorizontalEnd, InfoIcon } from "lucide-react";
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

  // find ranges for chart background
  // const ranges = getRanges(newMetricKey);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
        <span className="flex gap-2 items-center">
          <GalleryHorizontalEnd
            size={30}
            className="fill-pink-600 dark:text-accent-foreground"
          />
          <h1 className="text-md md:text-2xl font-bold text-primary">
            Core Web Vitals (Trend)
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
      {/* Render site-specific content */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        <div className="col-span-1 order-2 md:order-1 overflow-hidden overflow-x-clip md:col-span-7 w-full border-gray-500/20 dark:bg-secondary-background bg-primary-foreground border rounded-sm px-4">
          {/* custom chart background */}
          <div className="relative w-full h-[400px]">
            <ChartComponent metric_key={newMetricKey} />
            {/* {ranges && (
              <div className="absolute inset-0 z-0 flex items-end">
                <div
                  className={`relative w-[82%] ${
                    collapsed ? `md:w-[94%]` : `md:w-[93%]`
                  }  mx-6 translate-x-4 -translate-y-9 h-[315px] transition-all duration-500 ease-in-out`}
                >
                  <div
                    className="absolute w-full bg-red-300/20 dark:bg-transparent"
                    style={{
                      height: `${100 - percent(ranges.c)}%`,
                      bottom: `${percent(ranges.c)}%`,
                    }}
                  />
                  <div
                    className="absolute w-full bg-yellow-200/20 dark:bg-transparent"
                    style={{
                      height: `${percent(ranges.c) - percent(ranges.b)}%`,
                      bottom: `${percent(ranges.b)}%`,
                    }}
                  />
                  <div
                    className="absolute w-full bg-green-300/20 dark:bg-transparent"
                    style={{
                      height: `${percent(ranges.b) - percent(ranges.a)}%`,
                      bottom: 0,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="relative z-10 w-full h-[315px]">
              <ChartComponent metric_key={newMetricKey} />
            </div> */}
          </div>
        </div>
        {/* chart controls */}
        <div className="col-span-1 space-y-7 order-1 md:order-2 md:col-span-3 w-full border-gray-500/20 dark:bg-secondary-background bg-primary-foreground border rounded-sm px-6 py-7">
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
          <div className="w-full space-y-3 p-3 md:text-md rounded-sm bg-gray-500/10 dark:bg-secondary">
            <Tooltip>
              <TooltipTrigger>
                <span className="flex gap-2 item-center cursor-help text-accent-foreground/80 dark:text-accent-foreground font-semibold">
                  <FlaskRound className="fill-blue-500/50" />
                  <p>LiveTrend ?</p>
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
        </div>
      </div>
    </div>
  );
}
