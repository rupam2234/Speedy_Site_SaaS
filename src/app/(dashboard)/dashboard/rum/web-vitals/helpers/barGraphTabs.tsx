"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../../siteContext";
import { useWebVitalContext } from "../sharedProps";
import { Circle, LoaderIcon } from "lucide-react";

interface Props {
  activeMetric: "LCP" | "CLS" | "INP" | "TTFB" | "FCP";
}

export default function BarGraphTabs({ activeMetric }: Props) {
  const { selectedSite, selectedDevice } = useSiteContext();
  const { startDate, endDate } = useWebVitalContext();
  const [isloading, setLoading] = useState(false);
  const [pageWiseData, setPageWiseData] = useState<any>();

  const tabRef = useRef(null);

  console.log(pageWiseData);

  useEffect(() => {
    if (!tabRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          getUrlData();
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(tabRef.current);
    return () => observer.disconnect();
  }, [selectedSite, selectedDevice, startDate, endDate, activeMetric]);

  return (
    <div className="p-2 mt-3 md:mt-5" ref={tabRef}>
      {isloading === true ? (
        <LoaderIcon className="animate-spin text-primary/80" size={16} />
      ) : (
        <>
          {pageWiseData && pageWiseData.length > 0 ? (
            <>Data Available</>
          ) : (
            <>No data available</>
          )}
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
}
