"use client";

import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { CircleCheck, HeartPulse, InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getColor } from "@/lib/cwv_helper/getColor";
import { getCWVStatus } from "@/lib/cwv_helper/checkCwvStatus";
import SegmentedBar from "@/components/utils/webVitalBars";
import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Helpers } from "../cwv/helper/helperFunc";
import { cwv_metrics } from "../cwv/helper/cwvMetrics";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { PlanValidation } from "@/components/utils/activePlanValidation";
import DashboardToolbar from "@/components/utils/toolbar";

export default function WebsitePage() {
  const { selectedSite, setDailyCrux, dailyCrux, selectedDevice } =
    useSiteContext();
  const [hasTriedToLoad, setHasTriedToLoad] = useState(false);

  const helper = new Helpers();

  PlanValidation(); // redirect to billing if no active plan

  useEffect(() => {
    if (selectedSite) {
      helper.getDailyCrux(selectedSite, setDailyCrux);
    }
    const timeout = setTimeout(() => {
      setHasTriedToLoad(true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [selectedSite]);

  const currentCrux = helper.findDataByDevice(dailyCrux, selectedDevice);

  function findDensities(metricKey: string): {
    densities: number[] | undefined;
  } {
    const densities = currentCrux?.record?.metrics[metricKey]?.histogram?.map(
      (item) => Number((item.density * 100).toFixed(2))
    );
    if (densities) {
      return { densities };
    } else {
      return { densities: [] };
    }
  }

  const status = getCWVStatus(currentCrux?.record.metrics || {});

  function convertTextToBorderClasses(classString: string) {
    return classString.replace(/(\b(?:dark:)?)(text)(-)/g, "$1border$3");
  }

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
      <DashboardToolbar />
      <div className="flex flex-1 flex-col gap-6 py-6 px-5">
        <section id="web-vitals">
          <div className="flex flex-col items-start md:flex-row gap-2 md:items-center md:justify-between">
            <span className="flex gap-2 items-center">
              <HeartPulse
                size={30}
                className="fill-pink-600 dark:text-accent-foreground"
              />
              <h1 className="text-2xl font-bold text-primary">
                Web Vitals Overview
              </h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon size={25} />
                </TooltipTrigger>
                <TooltipContent side="right">
                  Tip: Hover over the cards—if 75% of users meet Web Vitals,
                  your site passes.
                </TooltipContent>
              </Tooltip>
            </span>
            <span
              className={`${convertTextToBorderClasses(
                status.colorClass
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
                dailyCrux
              );
              const data = findDensities(key);
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
                    <h3 className="text-sm font-semibold">{label}</h3>
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
    </>
  );
}
