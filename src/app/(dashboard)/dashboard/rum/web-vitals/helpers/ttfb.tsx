"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import TTFBPages from "./ttfb_components/ttfbPages";
import TTFBbyNetwork from "./ttfb_components/network";
import TTFBbyCountry from "./ttfb_components/country";

export type Contributor = {
  browser: string;
  city: string;
  country: string;
  device_type: string;
  downlink: number;
  isp: string;
  network_type: string;
  os: string;
  page_path: string;
  region: string;
  rtt: number;
  timezone: string;
  ttfb_dns_lookup: number;
  ttfb_ms: number;
  ttfb_request_start: number;
  ttfb_response_start: number;
  ttfb_tcp_connection: number;
};

export interface TTFBelementProps {
  contributors: Contributor[];
}

export default function TTFBelements({ contributors }: TTFBelementProps) {
  const [activeTabKey, setActiveTabKey] = useState<string | null>();

  return (
    <div className="border-t border-gray-200 dark:border-primary/10 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Major Contributors</p>
      </div>

      {/* Page TTFB */}
      <div className="space-y-2">
        <button
          onClick={() => handleActiveTab("page_tab")}
          className="w-full cursor-pointer flex items-center justify-between px-3 py-2 text-sm
                 border border-gray-200 dark:border-primary/10 rounded-md
                 hover:bg-gray-50 dark:hover:bg-primary/5 transition"
        >
          <p className="font-medium text-primary/70">
            Pages with the highest Time to First Byte
          </p>
          <ChevronDown
            size={16}
            className={`text-primary/60 transition-transform ${
              activeTabKey === "page_tab" ? "rotate-180" : ""
            }`}
          />
        </button>

        {activeTabKey === "page_tab" && (
          <TTFBPages contributors={contributors} />
        )}
      </div>

      {/* Network TTFB */}
      <div className="space-y-2">
        <button
          onClick={() => handleActiveTab("network")}
          className="w-full cursor-pointer flex items-center justify-between px-3 py-2 text-sm
                 border border-gray-200 dark:border-primary/10 rounded-md
                 hover:bg-gray-50 dark:hover:bg-primary/5 transition"
        >
          <p className="font-medium text-primary/70">
            Worst of Network TTFB Events (Average)
          </p>
          <ChevronDown
            size={16}
            className={`text-primary/60 transition-transform ${
              activeTabKey === "network" ? "rotate-180" : ""
            }`}
          />
        </button>

        {activeTabKey === "network" && (
          <TTFBbyNetwork contributors={contributors} />
        )}
      </div>

      {/* Country TTFB */}
      <div className="space-y-2">
        <button
          onClick={() => handleActiveTab("country")}
          className="w-full cursor-pointer flex items-center justify-between px-3 py-2 text-sm
                 border border-gray-200 dark:border-primary/10 rounded-md
                 hover:bg-gray-50 dark:hover:bg-primary/5 transition"
        >
          <p className="font-medium text-primary/70">
            Worst TTFB Events by Countries
          </p>
          <ChevronDown
            size={16}
            className={`text-primary/60 transition-transform ${
              activeTabKey === "country" ? "rotate-180" : ""
            }`}
          />
        </button>

        {activeTabKey === "country" && (
          <TTFBbyCountry contributors={contributors} />
        )}
      </div>
    </div>
  );

  function handleActiveTab(key: string) {
    if (key === activeTabKey) {
      setActiveTabKey(null);
    } else {
      setActiveTabKey(key);
    }
  }
}
