"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  ListFilter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layout,
  MousePointer2,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Copy,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSiteContext } from "../../../siteContext";

export type CLSGroup = {
  target_element: string;
  device: string;
  shift_count: number;
  total_impact_score: number;
  avg_magnitude: number;
  most_frequent_timing: string;
  sample_pages_to_test: string[];
};

const THEME = {
  red: "#ff6467",
  orange: "#ffb86a",
  green: "#00c950",
};

const ITEMS_PER_PAGE = 7;

const getActionableFix = (target: string, timing: string) => {
  const t = target.toLowerCase();
  if (timing.includes("<3s")) {
    if (t.includes("header") || t.includes("nav"))
      return "Header Shift: Set a 'min-height' on the navigation container to reserve space before menu rendering.";
    if (t.includes("img") || t.includes("figure"))
      return "Image Layout: Add explicit width/height attributes or 'aspect-ratio' in CSS to prevent layout jumps on load.";
    return "Initial Paint Shift: Likely caused by custom fonts loading. Use 'font-display: swap' or check for late-loading global CSS.";
  }
  if (timing.includes("3-8s")) {
    if (t.includes("ad") || t.includes("ins") || t.includes("slot"))
      return "Ad-Slot Instability: Wrap your ad unit in a placeholder div with a fixed minimum height to reserve the space.";
    return "Dynamic Content: An element entered the viewport late. Consider pre-sizing dynamic containers or disabling lazy-loading for hero items.";
  }
  return "Late Interaction Shift: Likely a popup, cookie banner, or late JS injection. Avoid inserting DOM elements above the user's current scroll position.";
};

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case "mobile":
      return <Smartphone size={14} />;
    case "tablet":
      return <Tablet size={14} />;
    default:
      return <Monitor size={14} />;
  }
};

export default function CLSInsights({
  contributors = [],
}: {
  contributors: CLSGroup[];
}) {
  const [activeElement, setActiveElement] = useState<CLSGroup | null>(null);
  const [sortBy, setSortBy] = useState<"impact" | "count">("impact");
  const [currentPage, setCurrentPage] = useState(1);
  const { selectedSite } = useSiteContext();

  const problematicElements = useMemo(() => {
    return [...contributors].sort((a, b) => {
      if (sortBy === "impact")
        return b.total_impact_score - a.total_impact_score;
      return b.shift_count - a.shift_count;
    });
  }, [contributors, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  const totalPages = Math.ceil(problematicElements.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return problematicElements.slice(start, start + ITEMS_PER_PAGE);
  }, [problematicElements, currentPage]);

  if (problematicElements.length === 0) {
    return (
      <div className="py-24 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-secondary-background/50 text-center">
        <CheckCircle2
          size={48}
          style={{ color: THEME.green }}
          className="mx-auto mb-4"
        />
        <h3 className="text-xl font-black">Visuals: Stable</h3>
        <p className="max-w-xs mx-auto text-sm text-neutral-500 mt-2 font-medium leading-relaxed px-6">
          No layout shifts detected above the 0.1 threshold. Your site provides
          a stable reading experience.
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
            <Layout size={28} style={{ color: THEME.red }} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tabular-nums leading-none mb-1"
              style={{ color: THEME.red }}
            >
              {problematicElements.length}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Unstable Selectors Found
            </p>
          </div>
        </div>

        <div className="relative p-5 border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-secondary-background rounded-md flex items-center gap-5">
          <div className="p-3 bg-amber-500/20 rounded-full">
            <MousePointer2 size={28} style={{ color: THEME.orange }} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tabular-nums leading-none mb-1"
              style={{ color: THEME.orange }}
            >
              {Math.max(...contributors.map((d) => d.shift_count))}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Max Shift Events per Element
            </p>
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
              Sorting by {sortBy === "impact" ? "Impact Score" : "Frequency"}
            </span>
            <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-md">
              <button
                onClick={() => setSortBy("impact")}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-sm transition-all ${sortBy === "impact" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-500"}`}
              >
                Impact
              </button>
              <button
                onClick={() => setSortBy("count")}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-sm transition-all ${sortBy === "count" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-500"}`}
              >
                Frequency
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {paginatedItems.map((item) => {
              const isUrgent = item.total_impact_score > 2.0;

              // Check if this specific item + device combo is the one currently hovered
              const isActive =
                activeElement?.target_element === item.target_element &&
                activeElement?.device === item.device;

              return (
                <div
                  key={`${item.target_element}-${item.device}`}
                  onMouseEnter={() => setActiveElement(item)}
                  className={`group relative flex items-center justify-between p-4 border-2 rounded-md cursor-pointer transition-all overflow-hidden
          ${
            isActive
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
                    {/* We use a span or div here with font-mono to keep the styling consistent */}
                    <div className="text-[12px] font-mono font-bold truncate leading-none mb-2 text-primary">
                      {item.target_element}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tabular-nums flex items-center gap-1">
                        <DeviceIcon type={item.device} /> {item.device}
                      </span>
                      <span className="text-[10px] font-black uppercase text-neutral-400">
                        {item.shift_count} events
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="text-xl font-mono font-black tabular-nums leading-none"
                      style={{ color: isUrgent ? THEME.red : THEME.orange }}
                    >
                      {item.total_impact_score.toFixed(2)}
                      <span className="text-[11px] ml-1 opacity-50 font-sans tracking-tighter">
                        score
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-2 border-2 border-neutral-200 dark:border-neutral-800 rounded disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-2 border-2 border-neutral-200 dark:border-neutral-800 rounded disabled:opacity-30"
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
                Impact Analysis
              </span>
            </div>

            {activeElement ? (
              <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] font-black text-neutral-500 uppercase">
                      Target Selector:
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          activeElement.target_element,
                        );
                        toast.success("Copied Selector");
                      }}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                    >
                      <Copy size={12} className="text-neutral-400" />
                    </button>
                  </div>
                  <code className="block p-3 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-100 dark:border-neutral-800 rounded text-[11px] font-mono break-all text-primary leading-relaxed">
                    {activeElement.target_element}
                  </code>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-md border border-neutral-100 dark:border-neutral-800">
                    <p className="text-[9px] font-black text-neutral-400 uppercase mb-1">
                      Avg. Shift Magnitude
                    </p>
                    <p className="text-lg font-mono font-black">
                      {activeElement.avg_magnitude.toFixed(3)}
                    </p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-md border border-neutral-100 dark:border-neutral-800">
                    <p className="text-[9px] font-black text-neutral-400 uppercase mb-1">
                      Occurred on
                    </p>
                    <div className="flex items-center gap-1.5 font-black uppercase text-xs">
                      <DeviceIcon type={activeElement.device} />{" "}
                      {activeElement.device}
                    </div>
                  </div>
                </div>

                {/* Developer Recommendation Box (Matches your Origin/Edge hit style) */}
                <div
                  className="p-5 border-2 rounded-md space-y-3"
                  style={{
                    borderColor: `${THEME.orange}33`,
                    backgroundColor: `${THEME.orange}08`,
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-neutral-500 uppercase">
                      Most Frequent Timing
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-neutral-800 text-white flex items-center gap-1">
                      <Clock size={10} /> {activeElement.most_frequent_timing}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3
                      className="text-xs font-black uppercase"
                      style={{ color: THEME.orange }}
                    >
                      Developer Fix
                    </h3>
                    <p className="text-[11px] font-medium leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {getActionableFix(
                        activeElement.target_element,
                        activeElement.most_frequent_timing,
                      )}
                    </p>
                  </div>
                </div>

                {/* TEST PAGES */}
                <div className="pt-4 border-t-2 border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-black uppercase text-neutral-400 block mb-3">
                    Live URL Test Samples
                  </span>
                  <div className="space-y-2">
                    {activeElement.sample_pages_to_test.map((url, i) => (
                      <Link
                        key={i}
                        href={`https://${selectedSite}${url}`}
                        target="_blank"
                        className="flex items-center justify-between p-2 rounded border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-secondary-background group transition-all"
                      >
                        <span className="text-[11px] font-mono truncate w-48">
                          {url}
                        </span>
                        <ExternalLink
                          size={12}
                          className="text-neutral-400 group-hover:text-primary"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse">
                  <Layout size={32} className="text-neutral-400" />
                </div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                  Select a Selector to Diagnose
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
