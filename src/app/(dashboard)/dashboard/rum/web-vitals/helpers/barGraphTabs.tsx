"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { useWebVitalContext } from "../sharedProps";
import { ConnectionStackBars, UrlStackBar } from "./charts";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  activeMetric: "LCP" | "CLS" | "INP" | "TTFB" | "FCP";
}

type tabTypes = "url" | "connection" | "countries";

export default function BarGraphTabs({ activeMetric }: Props) {
  const { selectedSite, selectedDevice } = useSiteContext();
  const { startDate, endDate } = useWebVitalContext();
  const [isloading, setLoading] = useState(false);
  const [pageWiseData, setPageWiseData] = useState<any>();
  const [connectionData, setconnectionData] = useState<any>();
  const [activeTab, setActivetab] = useState<tabTypes>("url");
  const mobile = useIsMobile(); // mobile devices may miss the tabRef lazy trigger

  const tabRef = useRef(null);
  const activeMetricRef = useRef<"LCP" | "CLS" | "INP" | "TTFB" | "FCP" | null>(
    null,
  );

  useEffect(() => {
    if (!tabRef.current) return;

    // this fixes rendering stack bar charts on mobile
    if (mobile && activeMetricRef.current !== activeMetric) {
      Promise.all([getUrlData(), getConnectionData()]);
      return;
    } else if (mobile && activeMetricRef.current === activeMetric) {
      getUrlData();
      return;
    }

    // if not mobile ....
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && activeMetricRef.current !== activeMetric) {
          activeMetricRef.current = activeMetric;
          await Promise.all([getUrlData(), getConnectionData()]);
        } else if (
          entry.isIntersecting &&
          activeMetricRef.current === activeMetric
        ) {
          await getUrlData();
        }

        observer.disconnect();
      },
      { rootMargin: "100px" },
    );

    observer.observe(tabRef.current);
    return () => observer.disconnect();
  }, [selectedSite, selectedDevice, startDate, endDate, activeMetric]);

  return (
    <div className="p-2 mt-2 md:mt-7" ref={tabRef}>
      {/* Tab Headers */}
      <div className="flex items-center">
        <h3 className="font-semibold text-sm mr-3">Distribution by:</h3>
        {["url", "connection", "countries"].map((tab) => (
          <span
            key={tab}
            className={`border-x border-t text-sm cursor-pointer border-primary/10 font-medium capitalize px-4 ${
              activeTab === tab
                ? "bg-primary/10 text-primary/80 dark:text-white"
                : "text-primary"
            }`}
            onClick={() => setActivetab(tab as unknown as tabTypes)}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Tab Content */}
      <div className="border rounded-sm border-primary/10 px-4 py-2">
        {isloading && activeTab === "url" ? (
          <div className="animate-pulse bg-primary/10 h-[468px]" />
        ) : activeTab === "connection" ? (
          connectionData && connectionData.length > 0 ? (
            <ConnectionStackBars data={connectionData} />
          ) : (
            <div className="bg-primary/10 h-[468px] flex items-center justify-center">
              No data available
            </div>
          )
        ) : activeTab === "url" ? (
          pageWiseData && pageWiseData.length > 0 ? (
            <UrlStackBar activeMetric={activeMetric} data={pageWiseData} />
          ) : (
            <div className="bg-primary/10 h-[468px] flex items-center justify-center">
              No data available
            </div>
          )
        ) : activeTab === "countries" ? (
          /* Add countries chart/component here if available */
          <div className="bg-primary/10 h-[468px] flex items-center justify-center">
            No data available
          </div>
        ) : null}
      </div>
    </div>
  );

  async function getUrlData() {
    setLoading(true);

    const res = await fetch("/api/rum/rum-web-vitals/group-by-page", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        domain_name: selectedSite,
        metric: activeMetric,
        device_tye: selectedDevice.toLowerCase(),
        result_count: 15,
        start_date: startDate?.toISOString().split("T")[0],
        end_date: endDate?.toISOString().split("T")[0],
      }),
    });

    if (!res.ok) {
      console.error(`Error: ${res.statusText}`);
      setPageWiseData([]);
      setLoading(false);
      return;
    }

    const data: any = await res.json();
    setLoading(false);
    setPageWiseData(data.data);
  }

  async function getConnectionData() {
    setLoading(true);

    const res = await fetch("/api/rum/rum-web-vitals/group-by-connection", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        domain: selectedSite,
        metric: activeMetric,
        startDate: startDate?.toISOString().split("T")[0],
        endDate: endDate?.toISOString().split("T")[0],
      }),
    });

    if (!res.ok) {
      console.error(`Error: ${res.statusText}`);
      setconnectionData([]);
      setLoading(false);
      return;
    }

    const data: any = await res.json();
    setLoading(false);
    setconnectionData(data.data);
  }
}
