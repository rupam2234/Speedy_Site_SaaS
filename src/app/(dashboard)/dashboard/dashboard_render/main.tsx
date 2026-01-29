"use client";

import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import {
  Bookmark,
  CircleCheck,
  HeartPulse,
  History,
  InfoIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getColor } from "@/lib/cwv_helper/getColor";
import { getCWVStatus } from "@/lib/cwv_helper/checkCwvStatus";
import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Helpers } from "./helper/helperFunc";
import { cwv_metrics } from "./helper/cwvMetrics";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
// import { fetchCrUXData } from "@/app/api/external/fetch_crux";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CustomTooltip,
  RumWebVitalToolbar,
  SegmentedBar,
} from "@/components/utils/index";
import { CoreWebVitalChart, DistributionChart } from "./helper/index";
import { DailyCrux } from "@/data-types/cruxData";

interface Experience {
  type: "p75" | "Distribution";
  tooltip: string;
}
const ExperienceConfig: Experience[] = [
  {
    type: "p75",
    tooltip:
      "75th percentile ensures a majority of users have a good experience, not just an average.",
  },
  {
    type: "Distribution",
    tooltip:
      "Distribution refers to how the metric values are spread across real users' experiences.",
  },
];

export default function WebsitePage() {
  const {
    selectedSite,
    setCruxData,
    cruxData,
    dailyCrux,
    endDate,
    selectedDevice,
    setDailyCrux,
    experienceType,
    setExperienceType,
  } = useSiteContext();
  const [hasTriedToLoad, setHasTriedToLoad] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>(
    "Largest Contentful Paint",
  );
  const [newMetricKey, setNewMetricKey] = useState<string>(
    "largest_contentful_paint",
  );
  const [acronym, setAcronym] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [latestMetric, setlatestMetric] = useState<number | string>(); // state for managing the latest metric data for daily card
  const [CruxChange, setCruxChange] = useState<number>(0);

  const [dailyWebVitals, setDailyWebVitals] = useState<DailyCrux>();

  const helper = useMemo(() => new Helpers(), []);

  useEffect(() => {
    setCruxChange(
      helper.calculateChange(cruxData, selectedDevice, newMetricKey, dailyCrux),
    );
  }, [newMetricKey, dailyCrux, cruxData, selectedDevice]);

  // 1. Fetch data when selectedSite changes
  // useEffect(() => {
  //   if (selectedSite) {
  //     fetchCrUXData(selectedSite, setCruxData);
  //     helper.getDailyCrux(selectedSite, setDailyCrux);
  //   }

  //   const timeout = setTimeout(() => {
  //     setHasTriedToLoad(true);
  //   }, 500);
  //   return () => clearTimeout(timeout);
  // }, [selectedSite]);

  // 2. Calculate metric when data changes
  // useEffect(() => {
  //   const metric = helper.getMetricValue(
  //     newMetricKey,
  //     selectedDevice,
  //     dailyCrux,
  //   );
  //   setlatestMetric(metric !== null ? metric : 0);
  // }, [dailyCrux, newMetricKey, selectedDevice]);

  // useEffect(() => {
  //   const metricAcronym = cwv_metrics?.find((X) => X.label === selectedMetric);
  //   if (metricAcronym) {
  //     setAcronym(metricAcronym.acronym);
  //     setUnit(metricAcronym.unit);
  //   }
  // }, [selectedMetric]);

  // const currentCrux = helper.findDataByDevice(dailyCrux, selectedDevice);

  const status = getCWVStatus(currentCrux?.record.metrics || {});

  if (!selectedSite && !hasTriedToLoad) {
    return (
      <div className="flex items-center justify-center md:mt-[-100px] min-h-full">
        <LoadingAnimation />
      </div>
    );
  }

  if (!selectedSite && hasTriedToLoad) {
    return (
      <div className="flex flex-col space-y-4 md:mt-[-100px] items-center justify-center min-h-full dark:text-secondary-background p-8">
        <p
          className="text-4xl md:text-6xl font-bold"
          style={{ color: "rgba(0, 0, 0, 0.2)" }}
        >
          Website 404
        </p>
        <p className="text-center text-muted-foreground w-full">
          We couldn&apos;t find the website you&apos;re looking for.
          <br />
          To get started, try{" "}
          <span className="font-medium text-foreground">
            adding a new site
          </span>{" "}
          using the left sidebar.
        </p>
      </div>
    );
  }

  return (
    <>
      <RumWebVitalToolbar
        enableDistribution={false}
        enableAllDevices={false}
        disableTablet={false}
        defaultDateRange={180} // 6 months back
      />
      <div className="flex flex-1 flex-col gap-6 py-6 px-5">
        {/* web vital bars (current date) */}
        <section id="web-vitals">
          <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
            <span className="flex gap-2 items-center">
              <HeartPulse
                size={24}
                className="fill-pink-600 dark:text-accent-foreground"
              />
              <h1 className="text-xl font-bold text-primary">
                Core Web Vital Status
              </h1>
            </span>
            <span
              className={`${convertTextToBorderClasses(
                status.colorClass,
              )} border-2 text-sm flex gap-2 items-center font-semibold px-4 py-2 bg-popover dark:bg-secondary-background rounded-md ${
                status.colorClass
              }`}
            >
              <CircleCheck size={20} className={`fill-background`} />
              <p>{status.label}</p>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {cwv_metrics?.map(({ label, key, unit }) => {
              const value = helper.getMetricValue(
                key,
                selectedDevice,
                dailyCrux,
              );
              // const data = findDensities(key);
              const colorClass =
                typeof value === "number"
                  ? getColor(key, value)
                  : "text-inherit";

              return (
                <div
                  key={label}
                  className="border rounded-sm p-4 dark:bg-secondary-background border-accent-foreground/20 bg-card text-card-foreground"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <>
                        {label === "Largest Contentful Paint" ||
                        label === "Interaction to Next Paint" ||
                        label === "Cumulative Layout Shifts" ? (
                          <CustomTooltip
                            trigger={
                              <Bookmark
                                size={20}
                                className="fill-blue-400 text-blue-400"
                              />
                            }
                            content={`Major core web vital component`}
                            delay={300}
                            side="top"
                          />
                        ) : (
                          <></>
                        )}
                        <h3 className="text-[16px] text-primary/80 font-semibold">
                          {label}
                        </h3>
                        <InfoIcon
                          size={18}
                          className="text-primary/50 hover:text-primary/70 transition-all duration-300"
                        />
                      </>
                    </div>
                    <div className="flex gap-2 items-center">
                      <p className={`text-sm font-semibold ${colorClass}`}>
                        {typeof value === "number" &&
                        key === "cumulative_layout_shift"
                          ? value.toFixed(3)
                          : value}{" "}
                        {unit}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help dark:text-accent-foreground text-accent bg-primary/80 dark:bg-secondary px-2 py-1 text-[12px] rounded-sm">
                            p75
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span>
                            {value !== "--" ? (
                              <>
                                Around 75% users experienced{" "}
                                <span className="lowercase">
                                  approximate {label}:
                                </span>{" "}
                                {value}
                              </>
                            ) : (
                              <>
                                No data for{" "}
                                <span className="lowercase">{label}</span>
                              </>
                            )}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {data.densities !== undefined && (
                    <SegmentedBar
                      good={data.densities[0]}
                      okay={data.densities[1]}
                      bad={data.densities[2]}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {/* Origin Web Vital Section */}
      <div className="flex flex-1 flex-col gap-3 pb-11 px-5 max-h-screen">
        {/* <span className="flex gap-2 items-center text-primary/80">
          <History size={22} />
          <h2 className="font-semibold text-[18px]">History</h2>
        </span> */}
        {/* Render charts and controls */}
        {/* <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
          <div className="relative pt-7 col-span-1 order-2 md:order-1 overflow-hidden overflow-x-clip md:col-span-7 w-full border-gray-500/20 dark:bg-secondary-background bg-primary-foreground border rounded-sm px-4">
            <div className="absolute z-50 top-4 left-6">
              {ExperienceConfig.map((x, index) => (
                <CustomTooltip
                  side="right"
                  delay={1000}
                  key={index}
                  trigger={
                    <button
                      className={`px-3 mx-1 text-sm py-1 rounded-sm cursor-pointer ${
                        experienceType === x.type
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/30 dark:text-primary text-primary-foreground"
                      }`}
                      onClick={() => handleExperience(x.type)}
                    >
                      {x.type}
                    </button>
                  }
                  content={x.tooltip}
                />
              ))}
            </div>
            <div className="absolute z-50 top-5 right-8">
              <div className="flex gap-2 items-center justify-around">
                {[
                  { color: "bg-[#66cc8f]", label: "Good" },
                  { color: "bg-[#FFEEA9]", label: "Okay" },
                  { color: "bg-[#FF9898]", label: "Poor" },
                ].map((x, index) => {
                  return (
                    <div className="flex gap-2 items-center" key={index}>
                      <div className={`w-7 h-3 rounded-[2px] ${x.color}`} />
                      <p>{x.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            {experienceType === "p75" ? (
              <div className="relative w-full h-[400px]">
                <CoreWebVitalChart metric_key={newMetricKey} />
              </div>
            ) : (
              <div className="relative w-full h-[400px]">
                <DistributionChart metric_key={newMetricKey} />
              </div>
            )}
          </div>
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
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground/80"
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
            <div className="w-full space-y-3 p-3 md:text-md rounded-sm bg-gray-500/10 dark:bg-secondary">
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex gap-3 item-center cursor-help text-accent-foreground/80 dark:text-accent-foreground font-semibold">
                    <div className="relative flex items-center justify-center mt-1 w-4 h-4">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <p>Daily Trend</p>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="w-[200px] md:w-[400px] text-[16px]">
                  Track daily data for the selected metric. You&apos;ll see
                  today&apos;s value first, followed by the percentage change
                  compared to the last reported value.
                </TooltipContent>
              </Tooltip>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Today&apos;s {acronym} : </span>
                  <span
                    className={`${getColor(
                      newMetricKey,
                      latestMetric as unknown as number,
                    )} font-semibold`}
                  >
                    {latestMetric} {unit}
                  </span>
                </div>

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
        </div> */}
      </div>
    </>
  );

  // function findDensities(metricKey: string): {
  //   densities: number[] | undefined;
  // } {
  //   const densities = currentCrux?.record?.metrics[metricKey]?.histogram?.map(
  //     (item) => Number((item.density * 100).toFixed(2)),
  //   );
  //   if (densities) {
  //     return { densities };
  //   } else {
  //     return { densities: [] };
  //   }
  // }

  function convertTextToBorderClasses(classString: string) {
    return classString.replace(/(\b(?:dark:)?)(text)(-)/g, "$1border$3");
  }

  function handleExperience(type: string) {
    setExperienceType(type === "p75" ? "p75" : "Distribution");
  }

  function setMetricKey(newMetric: string) {
    setSelectedMetric(newMetric);
    const metricKey = cwv_metrics?.find((x) => x.label === newMetric);
    setNewMetricKey(metricKey ? metricKey.key : "");
  }

  async function fetchDailyWebVitals() {
    if (!selectedSite) {
      setDailyWebVitals(undefined);
      return;
    }

    try {
      const res = await fetch("/api/crux/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site: selectedSite,
        }),
      });

      if (!res.ok) {
        throw new Error("Core web vital daily data fetch failed.");
      }

      const data: DailyCrux = await res.json();

      setDailyWebVitals(data);
    } catch (error) {
      console.error(error);
    }
  }
}
