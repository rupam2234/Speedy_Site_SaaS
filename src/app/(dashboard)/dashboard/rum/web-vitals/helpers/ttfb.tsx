"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  FileText,
  Globe,
  Signal,
  Activity,
  Zap,
} from "lucide-react";
import { TTFBbyCountry, TTFBbyNetwork, TTFBPages } from ".";

// Logic to determine TTFB Health based on Core Web Vitals
const getTtfbStatus = (ms: number) => {
  if (ms <= 800)
    return {
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      label: "Good",
    };
  if (ms <= 1800)
    return {
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      label: "Needs Improvement",
    };
  return { color: "text-rose-500", bg: "bg-rose-500/10", label: "Poor" };
};

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
  const [activeTabKey, setActiveTabKey] = useState<string | null>("page_tab");

  // Calculate high-level summary for the user
  const avgTtfb =
    contributors.reduce((acc, curr) => acc + curr.ttfb_ms, 0) /
    contributors.length;
  const status = getTtfbStatus(avgTtfb);

  const handleActiveTab = (key: string) => {
    setActiveTabKey(activeTabKey === key ? null : key);
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* 1. Executive Summary Header */}
      <div
        className={`p-4 rounded-xl border border-primary/5 ${status.bg} flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-background shadow-sm ${status.color}`}
          >
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              TTFB Analysis
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border ${status.color} border-current/20`}
              >
                {status.label}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Average server response time across {contributors.length} samples.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-1 md:text-right flex-col">
          <span
            className={`text-2xl font-mono font-bold leading-none ${status.color}`}
          >
            {Math.round(avgTtfb)}
            <span className="text-xs ml-1">ms</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase">
            Global Avg
          </span>
        </div>
      </div>

      {/* 2. Diagnostic Accordions */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
          Drill-down Dimensions
        </p>

        {/* Page Section */}
        <AccordionItem
          id="page_tab"
          title="Slowest Pages"
          description="Identify high-latency routes and dynamic content bottlenecks."
          icon={<FileText size={16} />}
          active={activeTabKey === "page_tab"}
          onClick={() => handleActiveTab("page_tab")}
        >
          <TTFBPages contributors={contributors} />
        </AccordionItem>

        {/* Network Section */}
        <AccordionItem
          id="network"
          title="Network Performance"
          description="Check how 4G, 5G, and Wi-Fi impact your connection times."
          icon={<Signal size={16} />}
          active={activeTabKey === "network"}
          onClick={() => handleActiveTab("network")}
        >
          <TTFBbyNetwork contributors={contributors} />
        </AccordionItem>

        {/* Country Section */}
        <AccordionItem
          id="country"
          title="Geographic Latency"
          description="Detect regional hosting issues or CDN cache misses."
          icon={<Globe size={16} />}
          active={activeTabKey === "country"}
          onClick={() => handleActiveTab("country")}
        >
          <TTFBbyCountry contributors={contributors} />
        </AccordionItem>
      </div>

      {/* 3. Educational Footer (Help people the most) */}
      <div className="bg-muted/30 rounded-lg p-4 border border-primary/5">
        <div className="flex items-center gap-2 text-primary/80 mb-2">
          <Zap size={14} className="text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-tight">
            Optimization Tips
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tip
            title="High DNS?"
            text="Use a DNS prefetch hint or switch to a faster provider like Cloudflare."
          />
          <Tip
            title="High TCP/SSL?"
            text="Check your certificate chain and ensure HTTP/3 is enabled on your CDN."
          />
          <Tip
            title="High Request?"
            text="Review slow DB queries or PHP/Node.js execution time on the server."
          />
        </div>
      </div>
    </div>
  );
}

// Sub-component: Accordion Item
function AccordionItem({
  title,
  description,
  icon,
  active,
  onClick,
  children,
}: any) {
  return (
    <div
      className={`overflow-hidden rounded-xl border transition-all duration-200 ${
        active
          ? "border-primary/20 bg-primary/5 shadow-sm"
          : "border-primary/5 hover:border-primary/10 bg-background"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-4 text-left group"
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-lg transition-colors ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:text-primary"}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-[13px] font-bold leading-none">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              {description}
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform duration-300 ${active ? "rotate-180 text-primary" : ""}`}
        />
      </button>

      {active && (
        <div className="px-4 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="pt-2 border-t border-primary/5">{children}</div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Quick Tips
function Tip({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold">{title}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {text}
      </p>
    </div>
  );
}
