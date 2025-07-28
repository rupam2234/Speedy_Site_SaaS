"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteContext } from "../../../siteContext";
import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import RumCwvChart from "../helpers/webvitalscharts";

type Trigger = {
  value: string;
  name: string;
};

export default function RUMCWV() {
  const [activeData, setActiveData] = useState<any>();
  const { selectedDevice, selectedSite } = useSiteContext();

  useEffect(() => {
    if (selectedSite) {
      get_rum_vitals();
    }
  }, [selectedSite]);

  async function get_rum_vitals() {
    try {
      const res = await fetch("/api/rum/rum-web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: "30days",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveData(data.metrics || []);
      } else {
        setActiveData([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      setActiveData([]);
    }
  }

  const filteredData = activeData?.filter(
    (x: any) => x.device_type === selectedDevice.toLowerCase()
  );

  const triggerList: Trigger[] = [
    { value: "lcp", name: "Largest Contentful Paint" },
    { value: "cls", name: "Cumulative Layout Shifts" },
    { value: "inp", name: "Interaction to Next Paint" },
    { value: "ttfb", name: "Time to First Byte" },
    { value: "fcp", name: "First Contentful Paint" },
  ];

  if (!selectedSite || activeData?.length == 0) {
    return (
      <div className="flex items-center justify-center md:mt-[-100px] min-h-full">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="m-5">
      <Tabs defaultValue="lcp" className="w-full">
        {/* Scrollable tab list container */}
        <div className="overflow-x-auto">
          <TabsList
            className="dark:bg-secondary-background bg-gray-500/10 p-1 rounded-none border-gray-500/20 
            whitespace-nowrap flex gap-2 sm:gap-4 w-full"
          >
            {triggerList.map((x) => (
              <TabsTrigger
                key={x.value}
                value={x.value}
                className="focus:outline-none rounded-none focus:ring-0 border-none active:bg-white active:shadow-none px-4 py-2 text-sm sm:text-base whitespace-nowrap"
              >
                {x.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Content remains static and responsive */}
        <div className="mt-4 px-2 sm:px-4">
          <TabsContent value="lcp">
            <RumCwvChart metric_key="lcp" data={filteredData} />
          </TabsContent>
          <TabsContent value="cls">
            <RumCwvChart metric_key="cls" data={filteredData} />
          </TabsContent>
          <TabsContent value="inp">
            <RumCwvChart metric_key="inp" data={filteredData} />
          </TabsContent>
          <TabsContent value="ttfb">
            <RumCwvChart metric_key="ttfb" data={filteredData} />
          </TabsContent>
          <TabsContent value="fcp">
            <RumCwvChart metric_key="fcp" data={filteredData} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
