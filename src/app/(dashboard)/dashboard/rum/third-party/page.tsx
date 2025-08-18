"use client";

import DashboardToolbar from "@/components/utils/toolbar";
import React, { useEffect, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import ThirdPartyCategoryPieChart, { DomainData } from "./helpers/chart";

interface ThirdPartyDomainData {
  site_domain: string;
  device_type: string;
  top_domains: {
    domain: string;
    frequency: number;
  }[];
}

export default function ThirdParty() {
  const { selectedSite, selectedDevice, rumDateRange } = useSiteContext();
  const [ThirdPartyData, setThirdPartyData] = useState<
    ThirdPartyDomainData[] | null
  >(null);
  const [classifyData, setClassifyData] = useState<DomainData[] | []>([]);

  const lastFetchKey = useRef<string | null>(null);
  const lastClassifyKey = useRef<string | null>(null); // ✅ To prevent repeated classification

  useEffect(() => {
    if (!selectedSite) return;

    const currentKey = `${selectedSite}-${rumDateRange}`;
    if (lastFetchKey.current === currentKey) return;

    lastFetchKey.current = currentKey;
    GetThirdPartyData();
  }, [selectedSite, rumDateRange]);

  useEffect(() => {
    if (!ThirdPartyData) return;

    const classifyKey = `${selectedSite}-${selectedDevice}-${rumDateRange}`;
    if (lastClassifyKey.current === classifyKey) return;

    lastClassifyKey.current = classifyKey;
    classifyDomains();
  }, [selectedDevice, selectedSite, ThirdPartyData, rumDateRange]);

  function dateRange() {
    if ((rumDateRange as unknown as string) === "last7") {
      return "7days";
    } else if ((rumDateRange as unknown as string) === "last24Hours") {
      return "24hours";
    }
    return "7days"; // Default fallback
  }

  async function GetThirdPartyData() {
    try {
      const res = await fetch("/api/rum/third-party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedSite, time_range: dateRange() }),
      });

      if (!res.ok) {
        setThirdPartyData([]);
        console.error("Unable to fetch third party data");
        return;
      }

      const data: any = await res.json();

      if (selectedSite === data.domain_name) {
        setThirdPartyData(data.metrics);
      } else {
        setThirdPartyData([]);
      }
    } catch (error) {
      console.error("Error fetching third party data:", error);
      setThirdPartyData([]);
    }
  }

  const activeDomains = ThirdPartyData?.filter(
    (x) => x.device_type === selectedDevice.toLowerCase()
  );

  async function classifyDomains() {
    const filteredDomains =
      activeDomains?.flatMap((x) =>
        x.top_domains.filter(
          (t) => t.domain !== "rum.thespeedysite.workers.dev"
        )
      ) || [];

    if (filteredDomains.length === 0) {
      setClassifyData([]);
      return;
    }

    const domains = filteredDomains.map((t) => t.domain);
    const frequency = filteredDomains.map((t) => t.frequency);

    try {
      const res = await fetch("/api/rum/third-party/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains, frequency }),
      });

      if (res.ok) {
        const data: any = await res.json();

        if (JSON.stringify(data) !== JSON.stringify(classifyData)) {
          setClassifyData(data);
        }
      } else {
        setClassifyData([]);
      }
    } catch (error) {
      console.error("Error classifying domains:", error);
      setClassifyData([]);
    }
  }

  if (ThirdPartyData === null) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <DashboardToolbar />
      <div className="min-h-screen p-5">
        {classifyData.length > 0 && (
          <ThirdPartyCategoryPieChart data={classifyData} />
        )}
      </div>
    </>
  );
}
