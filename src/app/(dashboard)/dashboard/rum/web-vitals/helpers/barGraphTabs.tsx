"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { UrlStackBar } from "./charts";
import { useIsMobile } from "@/components/theme/use-mobile";
import { LoaderCircleIcon } from "lucide-react";

interface Props {
  activeMetric: "LCP" | "CLS" | "INP" | "TTFB" | "FCP";
}

type tabTypes = "url" | "connection";

export default function BarGraphTabs({ activeMetric }: Props) {
  const { selectedSite, selectedDevice } = useSiteContext();
  const { startDate, endDate } = useSiteContext();
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
    <div className="mt-4 md:mt-7" ref={tabRef}>
      {/* Tab Headers */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold text-primary/70 uppercase tracking-wider">
          Distribution by
        </h3>

        <div className="flex bg-primary/5 p-1 rounded-md border border-primary/10">
          {["url", "connection"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActivetab(tab as unknown as tabTypes)}
              className={`px-4 py-1 text-sm font-medium capitalize transition-all rounded-lg ${
                activeTab === tab
                  ? "bg-white dark:bg-primary/20 text-primary shadow-sm"
                  : "text-primary/60 hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="border min-h-80 rounded-lg border-primary/10  dark:bg-transparent overflow-hidden">
        {isloading && activeTab === "url" ? (
          <div className="flex items-center justify-center w-full">
            <LoaderCircleIcon
              size={45}
              className="text-primary/30 animate-spin"
            />
          </div>
        ) : (
          <div className="p-4">
            {activeTab === "connection" ? (
              connectionData?.length > 0 ? (
                // <ConnectionStackBars data={connectionData} />
                <div className="h-60"></div>
              ) : (
                <LoaderCircleIcon
                  size={25}
                  className="flex items-center justify-center text-primary/30 animate-spin"
                />
              )
            ) : pageWiseData?.length > 0 ? (
              <UrlStackBar activeMetric={activeMetric} data={pageWiseData} />
            ) : (
              <LoaderCircleIcon
                size={25}
                className="flex items-center justify-center text-primary/30 animate-spin"
              />
            )}
          </div>
        )}
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
