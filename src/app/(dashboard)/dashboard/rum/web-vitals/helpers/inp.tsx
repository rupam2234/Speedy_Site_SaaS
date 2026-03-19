"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  ListFilter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Copy,
  Activity,
  Wrench,
  Code2,
  Layers,
  Info,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSiteContext } from "../../../siteContext";
import { CustomTooltip } from "@/components/theme";

export interface INPContributor {
  _target_selector: string;
  _interaction_type: string;
  _device: string;
  _occurrence_count: number;
  _avg_inp_ms: number;
  _p75_inp_ms: number;
  _main_cause: string;
  _sample_pages: string[];
}

const THEME = {
  red: "#ff6467",
  orange: "#ffb86a",
  green: "#00c950",
};

const ITEMS_PER_PAGE = 7;

/**
 * DOUBLE-SIDED DIAGNOSTIC LOGIC
 */
const getAdvice = (cause: string, selector: string) => {
  const s = selector.toLowerCase();

  // WP Version
  let wp =
    "Resource Review: Several active features may be competing for the main thread. Consider reviewing active plugins or simplifying the page layout.";
  // Dev Version
  let dev =
    "Main Thread Yielding: Break up long tasks (>50ms) using scheduler.yield() or requestIdleCallback to keep the UI responsive.";

  if (s.includes("ad") || s.includes("google") || s.includes("amazon")) {
    wp =
      "Ad Optimization: Ad scripts are slowing down clicks. Try delaying ads until the first scroll or check your ad provider's 'Lite' mode.";
    dev =
      "Third-Party Scripting: Move non-critical 3rd party scripts to a Web Worker or use 'requestIdleCallback' to prevent them from blocking user input.";
  } else if (
    s.includes("wprm") ||
    s.includes("recipe") ||
    s.includes("slick") ||
    s.includes("carousel")
  ) {
    wp =
      "Plugin Choice: This widget is resource-heavy. Try disabling unused animations in the plugin settings or use a faster Gutenberg-native block.";
    dev =
      "Event Handler Overhead: The interaction triggers heavy synchronous JS. Refactor the callback to handle only UI updates, deferring logic with setTimeout.";
  } else if (s.includes("menu") || s.includes("nav") || s.includes("cky")) {
    wp =
      "Exclusion Setting: If you use a 'Delay JavaScript' feature, ensure this element is EXCLUDED so it responds instantly to the first touch.";
    dev =
      "Hydration / Interaction: If using a framework, ensure this element isn't waiting on a heavy hydration task before responding to events.";
  }

  return { wp, dev };
};

export default function INPelements({
  contributors = [],
}: {
  contributors: INPContributor[];
}) {
  const [activeElement, setActiveElement] = useState<INPContributor | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<"p75" | "count">("p75");
  const [currentPage, setCurrentPage] = useState(1);
  const { selectedSite } = useSiteContext();

  const problematicElements = useMemo(() => {
    return [...contributors].sort((a, b) => {
      if (sortBy === "p75") return b._p75_inp_ms - a._p75_inp_ms;
      return b._occurrence_count - a._occurrence_count;
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
        <h3 className="text-xl font-black uppercase tracking-tight">
          Interactions: Healthy
        </h3>
        <p className="max-w-xs mx-auto text-sm text-neutral-500 mt-2 font-medium px-6">
          Your site responds to interactions in under 200ms.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans text-foreground">
      {/* 1. TOP SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="p-5 border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-secondary-background rounded-md flex items-center gap-5">
          <div className="p-3 bg-red-500/10 rounded-full">
            <Zap size={28} style={{ color: THEME.red }} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tabular-nums leading-none"
              style={{ color: THEME.red }}
            >
              {Math.max(...contributors.map((d) => d._p75_inp_ms))}ms
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1">
              Highest P75 Delay
            </p>
          </div>
        </div>
        <div className="p-5 border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-secondary-background rounded-md flex items-center gap-5">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <Layers size={28} style={{ color: THEME.orange }} />
          </div>
          <div>
            <h2
              className="text-3xl font-black tabular-nums leading-none"
              style={{ color: THEME.orange }}
            >
              {contributors.length}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1">
              Interection Events You Can Fix
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-neutral-500 flex items-center gap-2">
              <ListFilter size={14} />{" "}
              {sortBy === "p75" ? "Worst Latency" : "Frequency"}
            </span>
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-md">
              <button
                onClick={() => setSortBy("p75")}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-sm transition-all ${sortBy === "p75" ? "bg-white dark:bg-neutral-700 shadow-sm" : "text-neutral-500"}`}
              >
                Latency
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
            {paginatedItems.map((item) => (
              <div
                key={`${item._target_selector}-${item._device}`}
                onMouseEnter={() => setActiveElement(item)}
                className={`group relative flex items-center justify-between p-4 border-2 rounded-md cursor-pointer transition-all h-20
                  ${activeElement?._target_selector === item._target_selector && activeElement?._device === item._device ? "bg-neutral-50 dark:bg-neutral-800 border-neutral-400 shadow-sm" : "bg-white dark:bg-secondary-background border-neutral-100 dark:border-neutral-900 hover:border-neutral-300"}`}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{
                    backgroundColor:
                      item._p75_inp_ms > 500 ? THEME.red : THEME.orange,
                  }}
                />
                <div className="min-w-0 flex-1 pr-4 pl-2">
                  <code className="text-[11px] font-mono font-bold truncate block text-primary mb-1">
                    {item._target_selector}
                  </code>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400 uppercase">
                    <span className="bg-neutral-100 dark:bg-neutral-700 px-1 rounded">
                      {item._interaction_type}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-xl font-mono font-black"
                    style={{
                      color: item._p75_inp_ms > 500 ? THEME.red : THEME.orange,
                    }}
                  >
                    {Math.round(item._p75_inp_ms)}
                    <span className="text-[10px] ml-0.5 opacity-50">ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1">
              <span className="text-[10px] font-black text-neutral-400 uppercase">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-2 border-2 rounded-md disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-2 border-2 rounded-md disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Card (FIXED STABLE HEIGHT) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 self-start">
          <div className="border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-md overflow-hidden shadow-xl h-187.5 flex flex-col">
            <div className="p-4 border-b-2 border-neutral-100 dark:border-neutral-800 flex items-center gap-2 bg-neutral-50 dark:bg-secondary-background shrink-0">
              <Activity size={18} className="text-neutral-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                Diagnostic Analysis
              </span>
            </div>

            {activeElement ? (
              <div className="p-6 space-y-5 animate-in fade-in duration-300 overflow-hidden">
                <div className="space-y-2 shrink-0">
                  <div className="flex justify-between items-center text-[10px] font-black text-neutral-500 uppercase">
                    <div className="flex items-center gap-1">
                      <p>Target Selector</p>
                      <CustomTooltip
                        content={
                          <div className="space-y-3">
                            <p>
                              Copy this selector → go to a page from the sample
                              URLs below → open Developer Tools (Ctrl + Shift +
                              I on Windows) → go to the Elements tab → press
                              Ctrl + F and paste the copied selector to locate
                              the element.
                            </p>

                            <p>
                              Keep in mind that INP measures interaction events,
                              so it&apos;s usually related to menus, forms,
                              closing pop-ups, etc. In such cases, if the target
                              DOM element was captured during a dynamic
                              interaction, you may not be able to find the same
                              INP target in the static DOM.
                            </p>
                          </div>
                        }
                        side="left"
                        trigger={
                          <Lightbulb
                            size={20}
                            className="ml-1 rounded-full p-1 bg-primary/10 text-primary/80 cursor-pointer fill-amber-300"
                          />
                        }
                      />
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          activeElement._target_selector,
                        );
                        toast.success("Copied");
                      }}
                      className="p-1 hover:bg-neutral-100 rounded transition-colors"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <code className="block p-3 bg-neutral-50 dark:bg-neutral-800 border rounded text-[11px] font-mono overflow-y-auto text-primary leading-relaxed">
                    {activeElement._target_selector}
                  </code>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-md border text-center">
                    <p className="text-[9px] font-black text-neutral-400 uppercase mb-1">
                      P75 Latency
                    </p>
                    <p
                      className="text-lg font-mono font-black"
                      style={{
                        color:
                          activeElement._p75_inp_ms > 500
                            ? THEME.red
                            : THEME.orange,
                      }}
                    >
                      {Math.round(activeElement._p75_inp_ms)}ms
                    </p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-md border text-center">
                    <p className="text-[9px] font-black text-neutral-400 uppercase mb-1">
                      Frequency
                    </p>
                    <p className="text-lg font-mono font-black">
                      {activeElement._occurrence_count}
                    </p>
                  </div>
                </div>

                {/* DUAL RECOMMENDATION BOXES */}
                <div className="space-y-3 overflow-y-auto pr-1">
                  {/* WordPress Box */}
                  <div className="p-4 border-2 rounded-md space-y-2 bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase">
                      <Wrench size={12} /> WordPress Recommendation
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {
                        getAdvice(
                          activeElement._main_cause,
                          activeElement._target_selector,
                        ).wp
                      }
                    </p>
                  </div>

                  {/* Developer Box */}
                  <div className="p-4 border-2 rounded-md space-y-2 bg-green-500/5 border-green-500/20">
                    <div className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase">
                      <Code2 size={12} /> For Developers
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {
                        getAdvice(
                          activeElement._main_cause,
                          activeElement._target_selector,
                        ).dev
                      }
                    </p>
                  </div>
                </div>

                {/* URL SAMPLES - Fixed Height Area */}
                <div className="pt-4 space-y-3 border-t-2 border-neutral-100 dark:border-neutral-800 shrink-0">
                  <span className="text-[10px] font-black uppercase text-neutral-400 block">
                    Sample pages
                  </span>
                  <div className="space-y-2 ">
                    {activeElement._sample_pages.slice(0, 3).map((url, i) => (
                      <Link
                        key={url + i}
                        href={`https://${selectedSite}${url}`}
                        target="_blank"
                        className="flex items-center justify-between p-2 rounded border hover:bg-neutral-50 dark:hover:bg-neutral-800 group transition-all"
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
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-12 text-center">
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse">
                  <MousePointer2 size={32} className="text-neutral-400" />
                </div>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                  Select an Element to Diagnose
                </p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                  <Info size={12} /> Analyzes Input, Processing, and Paint
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
