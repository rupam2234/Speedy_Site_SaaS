"use client";

import { pageMetricCache } from "@/data/cachedPageData";
import { Button } from "@/components/ui/button";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { useEffect, useState } from "react";
// import CWV from "./cwv";
// import PageAssets from "./assets";
// import Timings from "./timings";
import { MonitorCheck, Smartphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";

interface LabViewProps {
  url: string;
  device: "Desktop" | "Mobile" | "Tablet" | "All";
}

export default function LabView({ url, device }: LabViewProps) {
  const {
    selectedDevice,
    setSelectedDevice,
    // activeLabMetric,
    // setActiveLabMetric,
  } = useSiteContext();
  const pageMetric = pageMetricCache((state) => state.pageMetric);

  const [pageData, setPageData] = useState<any>();

  const dataClassButtons: ("Web Vitals" | "Page Weight" | "Timings")[] = [
    "Web Vitals",
    "Page Weight",
    "Timings",
  ];

  // function handleDataClassButton(
  //   key: "Web Vitals" | "Page Weight" | "Timings"
  // ) {
  //   // setActiveLabMetric(key);
  // }

  // collect page data
  useEffect(() => {
    if (pageMetric?.length !== undefined && pageMetric?.length > 0) {
      const filteredMetric = pageMetric?.filter(
        (x) =>
          x.page_address === url.replace(/\/$/, "") &&
          x.device_type === device.toLowerCase()
      );

      setPageData(filteredMetric);
    }
  }, [pageMetric, device]);

  return (
    <>
      {Array.isArray(pageData) ? (
        <div className="w-full m-auto md:mx-auto md:my-0 overflow-hidden">
          {/* Toolbar at the Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 p-4 dark:bg-secondary-background bg-gray-300/10 border">
            <div className="flex items-center justify-start gap-2 cursor-pointer">
              <Tooltip>
                <TooltipTrigger asChild>
                  <MonitorCheck
                    onClick={() => setSelectedDevice("Desktop")}
                    size={24}
                    className={`p-[2px] ${
                      selectedDevice === "Desktop"
                        ? "text-primary"
                        : "text-gray-400"
                    } hover:bg-secondary-background/5 rounded-sm`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Desktop</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Smartphone
                    onClick={() => setSelectedDevice("Mobile")}
                    size={24}
                    className={`p-[2px] ${
                      selectedDevice === "Mobile"
                        ? "text-primary"
                        : "text-gray-400"
                    } hover:bg-secondary-background/5 rounded-sm`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">Mobile</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-start sm:justify-end">
              {dataClassButtons?.map((x) => {
                // const isActive = x === activeLabMetric;

                return (
                  <Button
                    key={x}
                    // className={`px-4 py-1 text-primary ${
                    //   isActive
                    //     ? "bg-transparent"
                    //     : "bg-blue-300 dark:bg-blue-900"
                    // } rounded-[2px] hover:text-accent dark:hover:bg-blue-700 dark:hover:text-primary cursor-pointer`}
                    // onClick={() => handleDataClassButton(x)}
                  >
                    {x}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Content Section */}

          {/* {activeLabMetric === "Web Vitals" ? (
            <CWV pageData={pageData} />
          ) : activeLabMetric === "Page Weight" ? (
            <PageAssets pageData={pageData} />
          ) : activeLabMetric === "Timings" ? (
            <Timings pageData={pageData} />
          ) : (
            <LoadingAnimation />
          )} */}
        </div>
      ) : (
        <LoadingAnimation />
      )}
    </>
  );
}
