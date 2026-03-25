"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Bot,
  CheckCircle2,
  Info,
  Layers,
  Activity,
  ListFilter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { useSiteContext } from "../../../siteContext";
import { CustomTooltip, LoadingAnimation } from "@/components/theme";

export type Contributor = {
  page_path: string;
  device_type: string;
  occurrence_count: number;
  p75_ttfb: number;
  p75_dns: number;
  p75_tcp: number;
  p75_server: number;
  origin_hit_rate: number;
  avg_rtt: number;
  avg_downlink: number;
  top_country: string;
  top_isp: string;
};

const THEME = {
  red: "#ff6467",
  orange: "#ffb86a",
  green: "#00c950",
};

const ITEMS_PER_PAGE = 7;

export default function TTFBelements({
  contributors = [],
}: {
  contributors: Contributor[];
}) {
  const [activePage, setActivePage] = useState<Contributor | null>(null);
  const [sortBy, setSortBy] = useState<"ttfb" | "samples">("ttfb");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { selectedSite } = useSiteContext();

  useEffect(() => {
    if (contributors.length > 0) {
      setLoading(false); // data arrived -> stop immediately
      return;
    }

    const timer = setTimeout(() => {
      setLoading(false); // fallback after 3s
    }, 5000);

    return () => clearTimeout(timer);
  }, [contributors]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  const problematicPages = useMemo(() => {
    return contributors
      .filter((c) => Number(c.p75_ttfb) > 800)
      .sort((a, b) => {
        if (sortBy === "ttfb") return b.p75_ttfb - a.p75_ttfb;
        return b.occurrence_count - a.occurrence_count;
      });
  }, [contributors, sortBy]);

  const totalPages = Math.ceil(problematicPages.length / ITEMS_PER_PAGE);
  const paginatedPages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return problematicPages.slice(start, start + ITEMS_PER_PAGE);
  }, [problematicPages, currentPage]);

  if (loading) {
    return <LoadingAnimation />;
  }

  if (problematicPages.length === 0) {
    return (
      <div className="py-24 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-secondary-background/50 text-center">
        <CheckCircle2
          size={48}
          style={{ color: THEME.green }}
          className="mx-auto mb-4"
        />
        <h3 className="text-xl font-black">TTFB: Optimal</h3>
        <p className="max-w-xs mx-auto text-sm text-neutral-500 mt-2 font-medium leading-relaxed px-6">
          All monitored pages respond within the 800ms threshold. Bots can index
          your site with 100% efficiency.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans text-foreground">
      {/* 1. TOP SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-secondary-background rounded-md flex items-center gap-5">
          <div className="p-3 bg-red-500/20 rounded-full">
            <Bot size={28} style={{ color: THEME.red }} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tabular-nums leading-none mb-1"
              style={{ color: THEME.red }}
            >
              {problematicPages.length}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              URLs detected with high TTFB
            </p>
          </div>
        </div>

        <div className="relative p-5 border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-secondary-background rounded-md flex items-center gap-5">
          <div className="p-3 bg-amber-500/20 rounded-full">
            <Layers size={28} style={{ color: THEME.orange }} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tabular-nums leading-none mb-1"
              style={{ color: THEME.orange }}
            >
              {Math.round(
                (problematicPages.filter((p) => p.origin_hit_rate > 50).length /
                  problematicPages.length) *
                  100,
              )}
              <span className="text-xl ml-0.5">%</span>
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Avg. Requests Bypasses CDN
            </p>
          </div>
          <div className="absolute top-3 right-3">
            <CustomTooltip
              content={
                <div className="space-y-3">
                  <p>
                    Correlating high TTFB with cache-control headers is the
                    first step toward optimization. You can monitor requests
                    headers that are triggering origin fetches by reviewing your{" "}
                    <span className="text-blue-400 font-medium">
                      <a
                        href={`/dashboard/rum/cache-efficiency?site=${selectedSite}`}
                      >
                        cache efficiency reports
                      </a>
                    </span>
                    .
                  </p>
                </div>
              }
              side="left"
              trigger={
                <Lightbulb
                  size={22}
                  className="ml-3 rounded-full p-1 bg-primary/10 text-primary/80 cursor-pointer fill-amber-300"
                />
              }
            />
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">
        {/* Left: Scrollable List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-neutral-500 flex items-center gap-2">
              <ListFilter size={14} />
              Sorting by {sortBy === "ttfb" ? "Latency" : "Sample Volume"}
            </span>
            <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-md">
              <button
                onClick={() => setSortBy("ttfb")}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-sm transition-all ${sortBy === "ttfb" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-50"}`}
              >
                TTFB
              </button>
              <button
                onClick={() => setSortBy("samples")}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-sm transition-all ${sortBy === "samples" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-500"}`}
              >
                Samples
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {paginatedPages.map((page, idx) => {
              const isUrgent = page.p75_ttfb > 1800;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setActivePage(page)}
                  className={`group relative flex items-center justify-between p-4 border-2 rounded-md cursor-pointer transition-all overflow-hidden
                              ${
                                activePage?.page_path === page.page_path
                                  ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-500"
                                  : "bg-white dark:bg-secondary-background border-neutral-100 dark:border-neutral-900 hover:border-neutral-300"
                              }
                          `}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{
                      backgroundColor: isUrgent ? THEME.red : THEME.orange,
                    }}
                  />

                  <div className="min-w-0 flex-1 pr-4 pl-2">
                    <p className="text-sm font-medium truncate leading-none mb-2">
                      {page.page_path}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tabular-nums">
                        <span className="text-neutral-600 dark:text-neutral-300">
                          {page.occurrence_count} samples
                        </span>
                      </span>
                      {page.origin_hit_rate > 50 && (
                        <span
                          className="text-[10px] font-black uppercase flex items-center gap-1"
                          style={{ color: THEME.orange }}
                        >
                          <Zap size={12} fill={THEME.orange} /> Cache Miss
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xl font-mono font-black tabular-nums leading-none"
                      style={{ color: isUrgent ? THEME.red : THEME.orange }}
                    >
                      {Math.round(page.p75_ttfb)}
                      <span className="text-[11px] ml-1 opacity-50 font-sans tracking-tighter">
                        ms
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="p-2 border-2 border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="p-2 border-2 border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sticky Diagnostic Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
          <div className="border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-md overflow-hidden shadow-xl">
            <div className="p-4 border-b-2 border-neutral-100 dark:border-neutral-800 flex items-center gap-2 bg-neutral-50 dark:bg-secondary-background">
              <Activity size={18} className="text-neutral-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                Live Diagnostic
              </span>
            </div>

            {activePage ? (
              <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <div className="text-[10px] py-0.5 font-black flex gap-2 items-center text-neutral-500 uppercase">
                    Page link:{" "}
                    <Link
                      href={`https://${selectedSite}${activePage.page_path}`}
                      target="_blank"
                      rel="nofollow"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] py-0.5 font-black text-neutral-500 uppercase">
                      Country: {activePage.top_country}
                    </span>
                    <span className="text-[10px] py-0.5 font-black text-neutral-500 uppercase">
                      Network Provider: {activePage.top_isp.slice(0, 18)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      Latency Breakdown
                    </span>
                    <span
                      className="text-lg font-mono font-black"
                      style={{
                        color:
                          activePage.p75_ttfb > 1800 ? THEME.red : THEME.orange,
                      }}
                    >
                      {Math.round(activePage.p75_ttfb)}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <PhaseStat label="DNS" val={activePage.p75_dns} />
                    <PhaseStat
                      label="TCP/SSL"
                      val={activePage.p75_tcp}
                      color={THEME.orange}
                    />
                    <PhaseStat label="Server" val={activePage.p75_server} />
                  </div>
                </div>

                <div
                  className="p-5 border-2 rounded-md space-y-3 transition-colors"
                  style={{
                    borderColor:
                      activePage.origin_hit_rate > 50
                        ? `${THEME.red}33`
                        : `${THEME.green}33`,
                    backgroundColor:
                      activePage.origin_hit_rate > 50
                        ? `${THEME.red}08`
                        : `${THEME.green}08`,
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-neutral-500 uppercase">
                      Request status
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${activePage.origin_hit_rate > 50 ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}
                    >
                      {activePage.origin_hit_rate > 50 ? "Origin" : "Edge Hit"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3
                      className="text-3xl font-mono font-black"
                      style={{
                        color:
                          activePage.origin_hit_rate > 50
                            ? THEME.red
                            : THEME.green,
                      }}
                    >
                      {Math.round(activePage.origin_hit_rate)}%
                    </h3>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">
                      Requests reaches origin server
                    </span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {activePage.origin_hit_rate > 50
                      ? "User requests hitting your backend server for this page instead of edge cache. CDN greatly improves TTFB and is a ideal candiate to sit in front of your server."
                      : "CDN is serving this page effectively. High latency likely points to slow database queries or application middleware."}
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={16} style={{ color: THEME.red }} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
                      Crawl Budget Impact
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal font-medium">
                    Googlebot and AI Scrapers penalize slow response times and
                    TTFB. At{" "}
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {Math.round(activePage.p75_ttfb)}ms
                    </span>
                    , this URL is consuming{" "}
                    <span className="font-bold text-red-500 dark:text-red-400">
                      {(activePage.p75_ttfb / 250).toFixed(1)}x
                    </span>{" "}
                    more crawl budget than an optimized page (250ms baseline).
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse">
                  <Info size={32} className="text-neutral-400" />
                </div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                  Hover a URL to Diagnose
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseStat({
  label,
  val,
  color,
}: {
  label: string;
  val: number;
  color?: string;
}) {
  return (
    <div className="bg-primary/5 dark:bg-neutral-800/50 p-2 rounded-sm border border-neutral-100 dark:border-neutral-800">
      <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter mb-1">
        {label}
      </p>
      <p
        className="text-sm font-mono font-black"
        style={{ color: color || "inherit" }}
      >
        {Math.round(val)}
        <span className="text-[10px] ml-0.5 opacity-40 font-sans">ms</span>
      </p>
    </div>
  );
}
