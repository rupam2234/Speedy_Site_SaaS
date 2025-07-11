"use client";

import { pageMetricCache } from "@/components/globalData/cachedPageData";
import { Button } from "@/components/ui/button";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { useEffect, useState } from "react";
import CWV from "./cwv";

interface LabViewProps {
  url: string;
  device: "Desktop" | "Mobile";
}

export default function LabView({ url, device }: LabViewProps) {
  const pageMetric = pageMetricCache((state) => state.pageMetric);

  const [pageData, setPageData] = useState<any>(); // individual pages (filtered)
  const [activeDataClass, setActiveDataClass] = useState<
    "Web Vitals" | "Page Weight" | "Server"
  >("Web Vitals");

  const dataClassButtons: ("Web Vitals" | "Page Weight" | "Server")[] = [
    "Web Vitals",
    "Page Weight",
    "Server",
  ];

  function handleDataClassButton(key: "Web Vitals" | "Page Weight" | "Server") {
    setActiveDataClass(key);
  }

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
          <div className="flex flex-wrap gap-2 mt-3 p-4 justify-between dark:bg-secondary-background bg-gray-300/10 border sm:justify-end">
            {dataClassButtons?.map((x) => {
              const isActive = x === activeDataClass;

              return (
                <Button
                  key={x}
                  className={`px-4 py-1 text-primary ${
                    isActive ? "bg-transparent" : "bg-blue-300 dark:bg-blue-900"
                  } rounded-[2px] hover:text-accent dark:hover:bg-blue-700 dark:hover:text-primary cursor-pointer`}
                  onClick={() => handleDataClassButton(x)}
                >
                  {x}
                </Button>
              );
            })}
          </div>

          {/* Content Section */}

          {activeDataClass === "Web Vitals" ? (
            <CWV url={url} pageData={pageData} />
          ) : activeDataClass === "Page Weight" ? (
            <div className="p-6 h-max">Page Weight</div>
          ) : activeDataClass === "Server" ? (
            <div className="p-6 h-max">Server</div>
          ) : (
            <LoadingAnimation />
          )}
        </div>
      ) : (
        <LoadingAnimation />
      )}
    </>
  );
}
