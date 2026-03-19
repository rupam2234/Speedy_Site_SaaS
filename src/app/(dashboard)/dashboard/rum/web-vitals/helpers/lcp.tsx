"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageIcon,
  Type,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useSiteContext } from "../../../siteContext";

interface Contributor {
  device_type: string;
  element_target: string;
  page_url: string;
  image_url: string | null;
  font_family: string | null;
  font_weight: number | null;
  font_size: number | null;
  font_transfer_size: number | null;
  occurrence_count: number;
  avg_lcp_value: number;
  p75_lcp_value: number;
  avg_resource_load_delay: number | null;
  avg_resource_load_duration: number | null;
  avg_element_render_delay: number | null;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

const getVitalColor = (ms: number) => {
  if (ms <= 2500) return "text-emerald-500";
  if (ms <= 4000) return "text-amber-500";
  return "text-red-500";
};

export default function LCPelements({
  contributors,
}: {
  contributors: Contributor[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const { selectedSite } = useSiteContext();

  const filtered = useMemo(
    () =>
      contributors.filter(
        (c) =>
          c.element_target.toLowerCase().includes(search.toLowerCase()) ||
          c.page_url.toLowerCase().includes(search.toLowerCase()),
      ),
    [contributors, search],
  );

  const activeItems = filtered.slice((page - 1) * rows, page * rows);
  const totalPages = Math.ceil(filtered.length / rows) || 1;

  return (
    <div className="w-full text-foreground font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-100/50 dark:bg-secondary-background rounded-sm mb-4">
        <div className="flex items-center gap-3 flex-1 px-2">
          <Search size={16} className="text-neutral-500" />
          <input
            placeholder="Search elements or URLs..."
            className="bg-transparent outline-none w-full text-sm placeholder:text-neutral-500 text-foreground"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-6 text-xs font-bold text-neutral-500 uppercase tracking-tighter">
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <select
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer border-b border-neutral-400 dark:border-neutral-600 hover:text-foreground transition-colors"
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n} className="dark:bg-neutral-900">
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 border-l border-neutral-300 dark:border-neutral-700 pl-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="hover:text-foreground disabled:opacity-20"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="hover:text-foreground disabled:opacity-20"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {contributors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-sm bg-neutral-50/30 dark:bg-secondary-background/50 text-center">
          <div className="p-3 bg-emerald-500/10 rounded-full mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            No LCP Elements Found
          </h3>
          <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400 mt-2 px-6">
            Your Largest Contentful Paint is likely within the healthy range. No
            specific elements were identified as slowing down your pages.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {activeItems.map((item, i) => {
          const delay = item.avg_resource_load_delay || 0;
          const load = item.avg_resource_load_duration || 0;
          const render = item.avg_element_render_delay || 0;
          const totalPhases = delay + load + render;

          return (
            <div
              key={i}
              className="group border border-neutral-300 dark:border-neutral-700 rounded-sm bg-white dark:bg-secondary-background overflow-hidden transition-all hover:shadow-md"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* 1. LCP Metric Column (Left) */}
                <div className="lg:col-span-2 p-5 bg-neutral-50 dark:bg-neutral-900/40 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-center items-center lg:items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                    Avg LCP
                  </span>
                  <div
                    className={`text-3xl font-mono font-bold ${getVitalColor(item.avg_lcp_value)}`}
                  >
                    {(item.avg_lcp_value / 1000).toFixed(2)}s
                  </div>
                  <div className="mt-4 w-full pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase">
                      <span>P75 Goal</span>
                      <span className={getVitalColor(item.p75_lcp_value)}>
                        {(item.p75_lcp_value / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Content Details (Center) */}
                <div className="lg:col-span-6 p-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {item.image_url ? (
                          <ImageIcon size={14} />
                        ) : (
                          <Type size={14} />
                        )}
                      </div>
                      <code className="text-[12px] font-mono font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900/80 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded-sm truncate flex-1 shadow-sm">
                        {item.element_target}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.element_target);
                          toast.success("Copied to clipboard");
                        }}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 rounded-sm transition-all"
                      >
                        <Copy size={14} className="text-neutral-500" />
                      </button>
                    </div>

                    <Link
                      href={`https://${selectedSite}${item.page_url}`}
                      target="_blank"
                      className="text-xs font-medium text-neutral-500 hover:text-foreground flex items-center gap-1.5 transition-colors underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-4"
                    >
                      <ExternalLink size={12} /> {item.page_url}
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center">
                    {item.image_url ? (
                      <Link
                        href={item.image_url}
                        target="_blank"
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1.5"
                      >
                        <ImageIcon size={12} /> View Image Source
                      </Link>
                    ) : (
                      item.font_family && (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-500 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-sm">
                          <span className="uppercase tracking-tighter opacity-70">
                            Font:
                          </span>
                          <span>
                            {item.font_family.replace(/['"]/g, "")} (
                            {item.font_weight})
                          </span>
                          {item.font_transfer_size && (
                            <span className="ml-1 opacity-70">
                              {(item.font_transfer_size / 1024).toFixed(0)}KB
                            </span>
                          )}
                        </div>
                      )
                    )}
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tabular-nums border-l border-neutral-300 dark:border-neutral-700 pl-4">
                      {item.occurrence_count} Samples • {item.device_type}
                    </span>
                  </div>
                </div>

                {/* 3. Debugging Timeline (Right) */}
                <div className="lg:col-span-4 p-5 bg-neutral-50/50 dark:bg-neutral-900/20 lg:border-l border-neutral-200 dark:border-neutral-800">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Phase Breakdown
                    </span>
                    <span className="text-[12px] font-mono font-bold text-foreground tabular-nums">
                      {Math.round(totalPhases)}ms
                    </span>
                  </div>

                  {/* Horizontal Bar - High Contrast */}
                  <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded-sm flex overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${(delay / totalPhases) * 100}%` }}
                      className="h-full bg-neutral-400 dark:bg-neutral-600 border-r border-black/5"
                    />
                    <div
                      style={{ width: `${(load / totalPhases) * 100}%` }}
                      className="h-full bg-amber-500 border-r border-black/5"
                    />
                    <div
                      style={{ width: `${(render / totalPhases) * 100}%` }}
                      className="h-full bg-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-bold uppercase text-neutral-500">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-neutral-400 dark:bg-neutral-600" />{" "}
                        Delay
                      </div>
                      <span className="text-foreground font-mono text-xs">
                        {Math.round(delay)}ms
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-amber-500" /> Load
                      </div>
                      <span className="text-foreground font-mono text-xs">
                        {Math.round(load)}ms
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-emerald-500" />{" "}
                        Render
                      </div>
                      <span className="text-foreground font-mono text-xs">
                        {Math.round(render)}ms
                      </span>
                    </div>
                  </div>

                  {/* Insight Card */}
                  <div className="mt-5 p-3 rounded-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex gap-3 shadow-sm">
                    <AlertCircle
                      size={14}
                      className="text-amber-500 shrink-0 mt-0.5"
                    />
                    <p className="text-[11px] leading-snug text-neutral-600 dark:text-neutral-300 font-medium">
                      {getInsight(delay, load, render, !!item.font_family)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getInsight(
  delay: number,
  load: number,
  render: number,
  isFont: boolean,
) {
  const max = Math.max(delay, load, render);
  if (max === delay && delay > 600)
    return isFont
      ? "Fonts were discovered late by the browser. Add a preload link."
      : "Asset discovery delay. Remove loading='lazy' from the LCP element.";
  if (max === load && load > 1000)
    return isFont ? (
      "The font file is quite large. Ensure you are using WOFF2 format."
    ) : (
      <span>
        Resource load is slow. Use{" "}
        <a href="/pixel" className="text-blue-400">
          Pixel{" "}
        </a>
        to compress the image or CDN response times.
      </span>
    );
  if (max === render && render > 400)
    return "Render delay. The browser is likely blocked by long-running JavaScript or CSS.";
  return "Metric phases are balanced. Focus on general site-wide performance optimizations.";
}
