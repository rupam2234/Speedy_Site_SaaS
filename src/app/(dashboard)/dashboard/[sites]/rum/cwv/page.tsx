"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteContext } from "../../../siteContext";
import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import RumCwvChart from "../helpers/webvitalscharts";
import LCPBreakdownChart from "../helpers/lcpBreakDown";

type Trigger = {
  value: string;
  name: string;
};

export default function RUMCWV() {
  const [activeData, setActiveData] = useState<any>();
  const { selectedDevice, selectedSite } = useSiteContext();
  const [activeTab, setActiveTab] = useState("lcp");
  const [lcp_analysis, set_lcp_analysis] = useState<any>();

  useEffect(() => {
    if (selectedSite) {
      get_rum_vitals();
    }
  }, [selectedSite]);

  useEffect(() => {
    if (selectedSite && activeTab === "lcp") {
      get_lcp_analysis();
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

  async function get_lcp_analysis() {
    try {
      const res = await fetch("/api/rum/lcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: "7days",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set_lcp_analysis(data.metrics || []);
      } else {
        set_lcp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_lcp_analysis([]);
    }
  }

  const filteredData = activeData?.filter(
    (x: any) => x.device_type === selectedDevice.toLowerCase()
  );

  console.log(lcp_analysis);

  const triggerList: Trigger[] = [
    { value: "lcp", name: "Largest Contentful Paint" },
    { value: "cls", name: "Cumulative Layout Shifts" },
    { value: "inp", name: "Interaction to Next Paint" },
    { value: "ttfb", name: "Time to First Byte" },
    { value: "fcp", name: "First Contentful Paint" },
  ];

  if (!selectedSite || !activeData) {
    return (
      <div className="flex items-center justify-center md:mt-[-100px] min-h-full">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="m-5">
      <Tabs
        defaultValue="lcp"
        className="w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
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
                className="focus:outline-none rounded-none focus:ring-0 border-none active:bg-white active:shadow-none px-4 py-2 text-sm  whitespace-nowrap"
              >
                {x.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Content remains static and responsive */}
        <div className="mt-2">
          <TabsContent value="lcp" className="space-y-3">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="lcp" data={filteredData} />
            </div>
            <div>
              <LCPBreakdownChart data={lcp_analysis || []} />

              <LCPBreakdownChart data={lcp_analysis} />
            </div>
          </TabsContent>
          <TabsContent value="cls">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="cls" data={filteredData} />
            </div>
          </TabsContent>
          <TabsContent value="inp">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="inp" data={filteredData} />
            </div>
          </TabsContent>
          <TabsContent value="ttfb">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="ttfb" data={filteredData} />
            </div>
          </TabsContent>
          <TabsContent value="fcp">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="fcp" data={filteredData} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
