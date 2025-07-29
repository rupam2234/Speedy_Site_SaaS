"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteContext } from "../../siteContext";
import { useEffect, useState } from "react";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import RumCwvChart from "../helpers/webvitalscharts";
import LCPBreakdownChart from "../helpers/lcpBreakDown";
import CLSBreakdownChart from "../helpers/clsBreakDown";
import InpBreakDownChart from "../helpers/inpBreakdown";
import TTFBBreakdownChart from "../helpers/ttfbBreakDown";
import FCPBreakdownChart from "../helpers/fcpBreakDown";

type Trigger = {
  value: string;
  name: string;
};

export default function RUMCWV() {
  const [activeData, setActiveData] = useState<any>();
  const { selectedSite, rumDateRange } = useSiteContext();
  const [activeTab, setActiveTab] = useState("lcp");
  const [lcp_analysis, set_lcp_analysis] = useState<any>();
  const [cls_analysis, set_cls_analysis] = useState<any>();
  const [inp_analysis, set_inp_analysis] = useState<any>();
  const [ttfb_analysis, set_ttfb_analysis] = useState<any>();
  const [fcp_analysis, set_fcp_analysis] = useState<any>();

  useEffect(() => {
    if (selectedSite) {
      get_rum_vitals();
    }
  }, [selectedSite, rumDateRange]);

  useEffect(() => {
    if (selectedSite && activeTab === "lcp") {
      get_lcp_analysis();
    }
    if (selectedSite && activeTab === "cls") {
      get_cls_analysis();
    }
    if (selectedSite && activeTab === "inp") {
      get_inp_analysis();
    }
    if (selectedSite && activeTab === "ttfb") {
      get_ttfb_analysis();
    }
    if (selectedSite && activeTab === "fcp") {
      get_fcp_analysis();
    }
  }, [selectedSite, activeTab, rumDateRange]);

  async function get_rum_vitals() {
    try {
      const res = await fetch("/api/rum/rum-web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
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
          date_range: rumDateRange,
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

  async function get_cls_analysis() {
    try {
      const res = await fetch("/api/rum/cls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set_cls_analysis(data.metrics || []);
      } else {
        set_cls_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_cls_analysis([]);
    }
  }

  async function get_inp_analysis() {
    try {
      const res = await fetch("/api/rum/inp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set_inp_analysis(data.metrics || []);
      } else {
        set_inp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_inp_analysis([]);
    }
  }

  async function get_ttfb_analysis() {
    try {
      const res = await fetch("/api/rum/ttfb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set_ttfb_analysis(data.metrics || []);
      } else {
        set_ttfb_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_ttfb_analysis([]);
    }
  }

  async function get_fcp_analysis() {
    try {
      const res = await fetch("/api/rum/fcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        set_fcp_analysis(data.metrics || []);
      } else {
        set_fcp_analysis([]);
      }
    } catch (error) {
      console.error("Failed to fetch distribution:", error);
      set_fcp_analysis([]);
    }
  }

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
        <div className="overflow-x-scroll md:overflow-x-auto">
          <TabsList
            className="pl-4 dark:bg-secondary-background bg-gray-500/10 p-1 rounded-none border-gray-500/20 
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
          <TabsContent value="lcp" className="space-y-5">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="lcp" data={activeData} />
            </div>
            <div>
              <LCPBreakdownChart data={lcp_analysis || []} />
            </div>
          </TabsContent>
          <TabsContent value="cls" className="space-y-5">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="cls" data={activeData} />
            </div>
            <div>
              <CLSBreakdownChart data={cls_analysis || []} />
            </div>
          </TabsContent>
          <TabsContent value="inp" className="space-y-5">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="inp" data={activeData} />
            </div>
            <div>
              <InpBreakDownChart data={inp_analysis || []} />
            </div>
          </TabsContent>
          <TabsContent value="ttfb" className="space-y-5">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="ttfb" data={activeData} />
            </div>
            <div className="mt-5">
              <TTFBBreakdownChart data={ttfb_analysis || []} />
            </div>
          </TabsContent>
          <TabsContent value="fcp" className="space-y-5">
            <div className="border bg-primary-foreground dark:bg-secondary-background py-4 rounded-sm">
              <RumCwvChart metric_key="fcp" data={activeData} />
            </div>
            <div className="mt-5">
              <FCPBreakdownChart data={fcp_analysis || []} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
