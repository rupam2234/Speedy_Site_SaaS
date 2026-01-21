"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { useWebVitalContext } from "../sharedProps";
import UrlStackBar from "./charts/urls";

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

  const tabRef = useRef(null);

  useEffect(() => {
    if (!tabRef.current) return;

    const observer = new IntersectionObserver(
       ([entry]) => {
        if (entry.isIntersecting) {
          Promise.all([getUrlData(), getConnectionData()])
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(tabRef.current);
    return () => observer.disconnect();
  }, [selectedSite, selectedDevice, startDate, endDate, activeMetric]);

  console.log(connectionData)

  return (
    <div className="p-2 mt-2 md:mt-7" ref={tabRef}>
      {isloading === true ? (
        <div className="animate-pulse bg-primary/10 h-[468px]"></div>
      ) : (
        <>
          <div className="flex items-center">
            <h3 className="font-semibold text-sm mr-3">Distribution by:</h3>
            {["url", "connection", "countries"].map((x) => (
              <span
                className={`border-x border-t text-sm cursor-pointer border-primary/10 font-medium capitalize px-4 ${activeTab === x ? `bg-primary/10 text-primary/80 dark:text-white` : `text-primary`}`}
                key={x}
                onClick={() => setActivetab(x as unknown as tabTypes)}
              >
                {x}
              </span>
            ))}
          </div>
          <div className="border rounded-sm border-primary/10 px-4 py-2">
            {activeTab === "url" ? (
              <>
                {pageWiseData && pageWiseData.length > 0 ? (
                  <UrlStackBar
                    activeMetric={activeMetric}
                    data={pageWiseData.length > 0 ? pageWiseData : []}
                  />
                ) : (
                  <div className="bg-primary/10 h-[468px] flex items-center justify-center">
                    No data available
                  </div>
                )}
              </>
            ) : activeTab === "connection" ? (
              <>
                {pageWiseData && pageWiseData.length > 0 ? (
                  <>Connection data available</>
                ) : (
                  <div className="bg-primary/10 h-[468px] flex items-center justify-center">
                    No data available
                  </div>
                )}
              </>
            ): <></>}
          </div>
        </>
      )}
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
