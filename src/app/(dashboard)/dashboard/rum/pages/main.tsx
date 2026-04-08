"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSiteContext } from "../../siteContext";
import {
  ChevronDown,
  ChevronUp,
  InfoIcon,
  Bug,
  Copy,
  Check,
  LoaderCircle,
} from "lucide-react";
import TooltipIcon from "@/components/theme/customTooltip";
import { LoadingAnimation, PrimaryToolbar } from "@/components/theme";
import { cachedData, cleanExpiredCache } from "@/components/utils";

type PerformanceGroup = "poor" | "average" | "good";

export default function PagePerformanceAnalysis() {
  const { selectedSite, selectedDevice } = useSiteContext();
  const [pageData, setPageData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<PerformanceGroup>("poor");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const lastFetched = useRef<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // clear all expired cache
    cleanExpiredCache({ prefix: "page-groups", session_Storage: false });

    if (selectedSite && lastFetched.current !== selectedSite) {
      fetchData();
      lastFetched.current = selectedSite;
    }
  }, [selectedSite]);

  const { filteredList, counts } = useMemo(() => {
    const deviceFiltered = pageData.filter(
      (p) =>
        !selectedDevice ||
        selectedDevice === "All" ||
        p.device_type.toLowerCase() === selectedDevice.toLowerCase(),
    );
    const countsMap = {
      poor: deviceFiltered.filter(
        (p) => p.performance_group.toLowerCase() === "poor",
      ).length,
      average: deviceFiltered.filter(
        (p) => p.performance_group.toLowerCase() === "average",
      ).length,
      good: deviceFiltered.filter(
        (p) => p.performance_group.toLowerCase() === "good",
      ).length,
    };
    const list = deviceFiltered
      .filter((p) => p.performance_group.toLowerCase() === activeTab)
      .sort((a, b) => b.visit_count - a.visit_count);

    return { filteredList: list, counts: countsMap };
  }, [pageData, activeTab, selectedDevice]);

  if (!selectedSite)
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );

  const getThemeColor = () => {
    if (activeTab === "poor") return "text-red-500";
    if (activeTab === "average") return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <>
      <div className="px-5 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Page Groups
            </h2>
            <TooltipIcon
              content="Page groups aggregate field data by unique URL paths and most prominent contributors."
              trigger={
                <InfoIcon
                  size={18}
                  className="rounded-full cursor-pointer text-primary/30 hover:text-primary transition-colors"
                />
              }
              side="right"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-70">
            URL-BASED PERFORMANCE SEGMENTATION
          </p>
        </div>
      </div>

      <PrimaryToolbar
        defaultDateRange={7}
        enableDistribution={false}
        isSticky={true}
        enableAllDevices={false}
        disableCalender={true}
      >
        <div className="flex gap-1 bg-primary/5 p-1 rounded-md border border-primary/10">
          {(["good", "average", "poor"] as PerformanceGroup[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setExpandedRow(null);
              }}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all rounded-sm ${
                activeTab === tab
                  ? "bg-white dark:bg-primary text-primary dark:text-primary-foreground shadow-sm"
                  : "bg-transparent text-primary/50 hover:text-primary"
              }`}
            >
              {tab} <span className="opacity-60 ml-1">({counts[tab]})</span>
            </button>
          ))}
        </div>
      </PrimaryToolbar>

      <div className="text-primary">
        <div className="w-full">
          {loading && filteredList.length === 0 && (
            <div className="flex items-center justify-center min-h-[calc(100vh-500px)]">
              <LoaderCircle
                size={25}
                className="text-primary/20 animate-spin"
              />
            </div>
          )}
          {!loading && filteredList.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-primary/40 border-b border-primary/10">
                  <th className="py-3 px-6 font-bold w-12">#</th>
                  <th className="py-3 px-4 font-bold">URL Path</th>
                  <th className="py-3 px-4 font-bold text-center">Visits</th>
                  <th className="py-3 px-4 font-bold text-center">LCP</th>
                  <th className="py-3 px-4 font-bold text-center">INP</th>
                  <th className="py-3 px-4 font-bold text-center">CLS</th>
                  <th className="py-3 px-6 font-bold text-right">Debug</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredList.map((page, idx) => (
                  <React.Fragment key={idx}>
                    <tr
                      className={`group transition-colors cursor-pointer hover:bg-primary/3 ${
                        expandedRow === page.current_page ? "bg-primary/5" : ""
                      }`}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === page.current_page
                            ? null
                            : page.current_page,
                        )
                      }
                    >
                      <td className="py-4 px-6 text-xs opacity-40">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4 min-w-75">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-md">
                            {page.current_page}
                          </span>
                          <span className="text-[9px] opacity-30 font-bold uppercase tracking-tight">
                            {page.device_type}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-xs font-mono">
                        {page.visit_count}
                      </td>
                      <MetricCell value={page.avg_lcp_ms} type="lcp" />
                      <MetricCell value={page.avg_inp_ms} type="inp" />
                      <MetricCell value={page.avg_cls} type="cls" />
                      <td className="py-4 px-6 text-right">
                        {expandedRow === page.current_page ? (
                          <ChevronUp size={16} className="ml-auto opacity-20" />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="ml-auto opacity-20"
                          />
                        )}
                      </td>
                    </tr>

                    {expandedRow === page.current_page && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-primary/2">
                          <div className="px-14 py-8 grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-primary/10">
                            <TargetList
                              title="LCP Elements"
                              items={page.lcp_elements}
                              color={getThemeColor()}
                              site={selectedSite}
                              path={page.current_page}
                            />
                            <TargetList
                              title="CLS Shifters"
                              items={page.cls_elements}
                              color={getThemeColor()}
                              site={selectedSite}
                              path={page.current_page}
                            />
                            <TargetList
                              title="INP Targets"
                              items={page.inp_elements}
                              color={getThemeColor()}
                              site={selectedSite}
                              path={page.current_page}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredList.length === 0 && (
            <div className="py-20 text-center opacity-30 text-sm italic font-medium">
              No pages found in this category.
            </div>
          )}
        </div>
      </div>
    </>
  );

  async function fetchData() {
    // start loading
    setLoading(true);

    const { response } = await cachedData({
      fn: async () => {
        const res = await fetch("/api/rum/page_performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: selectedSite }),
        });
        const body: any = await res.json();
        return body.data;
      },
      session_Storage: false,
      key: `page-groups:${selectedSite}`,
      ttl: 5 * 60 * 1000,
    });

    if (!response) {
      setPageData([]);
      setLoading(false);
      return;
    }

    setPageData(response);
    setLoading(false);
  }
}

function MetricCell({
  value,
  type,
}: {
  value: number | null;
  type: "lcp" | "inp" | "cls";
}) {
  const getStyle = () => {
    if (value === null) return "text-primary/20";
    if (type === "lcp")
      return value > 4000
        ? "text-red-500"
        : value > 2500
          ? "text-yellow-500"
          : "text-green-500";
    if (type === "inp")
      return value > 500
        ? "text-red-500"
        : value > 200
          ? "text-yellow-500"
          : "text-green-500";
    if (type === "cls")
      return value > 0.25
        ? "text-red-500"
        : value > 0.1
          ? "text-yellow-500"
          : "text-green-500";
    return "";
  };

  const display =
    value === null
      ? "—"
      : type === "lcp"
        ? `${(value / 1000).toFixed(1)}s`
        : type === "inp"
          ? `${Math.round(value)}ms`
          : value.toFixed(3);

  return (
    <td
      className={`py-4 px-4 text-center font-mono text-xs font-bold ${getStyle()}`}
    >
      {display}
    </td>
  );
}

function TargetList({
  title,
  items,
  site,
  path,
}: {
  title: string;
  items: any[];
  color: string;
  site: string;
  path: string;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className={`text-[12px] font-bold uppercase tracking-widest`}>
        {title}
      </span>
      {items && items.length > 0 ? (
        items.map((item: any, i: number) => (
          <div
            key={i}
            className="flex items-center justify-between p-2.5 border border-primary/5 bg-primary/80 dark:bg-primary/10 group/item transition-colors hover:border-primary/20"
          >
            <div className="min-w-0 flex flex-col">
              <code
                className={`text-[12px] font-mono truncate max-w-45 dark:text-primary text-primary-foreground`}
                title={item.el}
              >
                {item.el}
              </code>
              <span className="text-[10px] uppercase font-semibold mt-1 dark:text-primary/80 text-primary-foreground/80">
                {item.count} detections
              </span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => handleCopy(item.el, i)}
                className="opacity-40 hover:opacity-100 transition-opacity"
                title="Copy selector"
              >
                {copiedIndex === i ? (
                  <Check size={13} className="text-green-500" />
                ) : (
                  <Copy
                    size={13}
                    className="dark:text-primary text-primary-foreground"
                  />
                )}
              </button>
              <Bug
                size={13}
                className="opacity-40 group-hover/item:opacity-100 group-hover/item:text-amber-500 cursor-pointer transition-all"
                onClick={() =>
                  window.open(
                    `https://${site}${path}?highlightSelector=${encodeURIComponent(item.el)}`,
                    "_blank",
                  )
                }
              />
            </div>
          </div>
        ))
      ) : (
        <span className="text-[10px] italic">No elements detected</span>
      )}
    </div>
  );
}
