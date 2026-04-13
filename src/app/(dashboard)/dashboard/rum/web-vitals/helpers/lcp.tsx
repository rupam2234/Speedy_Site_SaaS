"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageIcon,
  Type,
  CheckCircle2,
  MoveRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useSiteContext } from "../../../siteContext";
import { CustomTooltip, LoadingAnimation } from "@/components/theme";
import { LcpElements, timings } from "./types";

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

  if (loading) {
    return <LoadingAnimation />;
  }

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
            Your Largest Contentful Paint is likely within the healthy range, or
            we don&apos;t have enought data to show yet. No specific elements
            were identified as slowing down your pages.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {activeItems.map((item, i) => {
          const delay = item.avg_resource_load_delay || 0;
          const load = item.avg_resource_load_duration || 0;
          const render = item.avg_element_render_delay || 0;
          const totalPhases = delay + load + render;

          const analysis = analyzeLoadTime({
            asset_type: item.image_url === null ? "font" : "image",
            load_delay: delay,
            load_duration: load,
            render_delay: render,
          });

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
                  <div className="mt-4 w-full space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase">
                      <span>P75</span>
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
                      <CustomTooltip
                        content={
                          <>
                            Target element is associated with{" "}
                            {item.image_url
                              ? LcpElements.image
                              : LcpElements.font}{" "}
                            file
                          </>
                        }
                        side="bottom"
                        width="100px"
                        trigger={
                          <div className="p-1.5 rounded-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {item.image_url ? (
                              <ImageIcon size={14} />
                            ) : (
                              <Type size={14} />
                            )}
                          </div>
                        }
                      />

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

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500">
                        Most affacted page:{" "}
                      </span>
                      <Link
                        href={`https://${selectedSite}${item.page_url}`}
                        target="_blank"
                        className="text-xs font-medium text-neutral-500 hover:text-foreground flex items-center gap-1.5 transition-colors underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-4"
                      >
                        <ExternalLink size={12} />
                        {item.page_url}
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center">
                    {item.image_url ? (
                      <Link
                        href={item.image_url}
                        target="_blank"
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1.5"
                      >
                        View Image Source
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
                      Occured {item.occurrence_count} times for{" "}
                      {item.device_type} users
                    </span>
                  </div>
                </div>

                {/* 3. Debugging Timeline (Right) */}
                <div className="lg:col-span-4 p-5 bg-neutral-50/50 dark:bg-neutral-900/20 lg:border-l border-neutral-200 dark:border-neutral-800">
                  <div className="flex gap-2 items-end mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Key Asset Timings
                    </span>
                    {/* <span className="text-[12px] font-mono font-bold text-foreground tabular-nums">
                      {Math.round(totalPhases)}ms
                    </span> */}
                  </div>

                  <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-sm flex overflow-hidden shadow-inner">
                    <div
                      title={`Avg. Load Delay: ${delay}ms\nShare: ${((delay / totalPhases) * 100).toFixed(1)}%\nDelay before asset request starts.`}
                      style={{ width: `${(delay / totalPhases) * 100}%` }}
                      className="h-full bg-neutral-400 dark:bg-neutral-600 border-r cursor-pointer border-black/5"
                    />
                    <div
                      title={`Avg. Load Duration: ${load}ms\nShare: ${((load / totalPhases) * 100).toFixed(1)}%\nTime taken to download the asset.`}
                      style={{ width: `${(load / totalPhases) * 100}%` }}
                      className="h-full bg-amber-500 border-r border-black/5 cursor-pointer"
                    />
                    <div
                      title={`Avg. Render Delay: ${render}ms\nShare: ${((render / totalPhases) * 100).toFixed(1)}%\nTime after download until asset is painted.`}
                      style={{ width: `${(render / totalPhases) * 100}%` }}
                      className="h-full bg-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <CustomTooltip
                      width="550px"
                      trigger={
                        <div className="bg-primary/20 hover:bg-primary/40 text-xs mt-3 text-primary/80 px-2 py-0.5 rounded-sm">
                          Potential Reasons
                        </div>
                      }
                      content={
                        <div className="p-2 space-y-3">
                          <section className="space-y-1">
                            <p className="text-primary-foreground/80">
                              Potential Reasons:
                            </p>
                            {analysis.reasons.map((x, idx) => (
                              <div
                                className="flex items-center gap-2"
                                key={idx}
                              >
                                <MoveRightIcon size={14} className="min-w-5" />
                                {x}
                              </div>
                            ))}
                          </section>
                        </div>
                      }
                    />

                    <CustomTooltip
                      width="550px"
                      trigger={
                        <div className="bg-primary/20 hover:bg-primary/40 text-xs mt-3 text-primary/80 px-2 py-0.5 rounded-sm">
                          Solutions
                        </div>
                      }
                      content={
                        <div className="p-2 space-y-3">
                          <section className="space-y-1">
                            <p className="text-primary-foreground/80">
                              Solutions:
                            </p>
                            {analysis.solutions.map((x, idx) => (
                              <div
                                className="flex items-center gap-2"
                                key={idx}
                              >
                                <MoveRightIcon size={14} className="min-w-5" />
                                {x}
                              </div>
                            ))}
                          </section>
                        </div>
                      }
                    />
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

function analyzeLoadTime({
  load_delay,
  load_duration,
  render_delay,
  asset_type,
}: {
  load_delay: number;
  load_duration: number;
  render_delay: number;
  asset_type: "image" | "font";
}) {
  // major phase
  const maxVal = Math.max(load_delay, load_duration, render_delay);
  let phase: keyof typeof timings;

  if (maxVal === load_delay) phase = "load_delay";
  else if (maxVal === load_duration) phase = "load_duration";
  else phase = "render_delay";

  const threshold = timings[phase][asset_type];
  if (maxVal <= threshold) {
    return { status: "healthy", major_issue: null, reasons: [], solutions: [] };
  }

  const diagnostics: Record<
    keyof typeof timings,
    Record<"image" | "font", { reasons: string[]; solutions: string[] }>
  > = {
    load_delay: {
      image: {
        reasons: [
          "Image is not present in initial HTML (client-side rendered)",
          "Lazy-loaded for above the fold image (request deferred by browser)",
          "Image is discovered late due to external CSS or delayed stylesheet parsing",
          "Low fetch priority or missing preload hint causing browser to deprioritize request",
          "Main-thread blocking (JS execution or long tasks) delaying image request initiation",
          "Resource priority competition from higher priority assets delaying LCP image fetch",
        ],
        solutions: [
          "Remove loading='lazy' from the LCP image or exclude the asset from lazy load",
          "In WordPress, you can use WordPress `Featured Image` or direct HTML image instead of plugin-generated blocks",
          "Enable `preload` or `high priority` for the main image if your theme supports it",
          "Move image reference from CSS to an <img> tag in HTML",
          "Remove unnecessary plugins and defer third-party scripts until after main content loads",
        ],
      },
      font: {
        reasons: [
          "Font is defined in a CSS @import which delays discovery",
          "No preload hint provided or not marked as important so they load after other resources",
          "The browser delays fonts because other scripts or styles are still loading",
          "Slow font loading methods that delay text display",
          "",
        ],
        solutions: [
          "Add <link rel='preload' as='font'> in the HTML <head> or enable font preloading in your theme / performance plugin",
          "Switch to system fonts where possible for better performance",
          "Avoid using @import for font CSS files",
          "Inline the @font-face declaration in the HTML <style> tag",
          "Ensure the font is hosted on the same origin to avoid DNS lookup",
          "Remove unused fonts from theme or page builder settings",
        ],
      },
    },
    load_duration: {
      image: {
        reasons: [
          "File size is too large for the current network connection",
          "Image format is inefficient (e.g., using PNG/JPG instead of WebP)",
          "Slow Time to First Byte (TTFB) from the server or CDN",
          "Lack of responsive image sizes (serving desktop size to mobile)",
        ],
        solutions: [
          "Convert image to AVIF or WebP format",
          "Implement srcset and sizes for responsive delivery",
          "Use a Global CDN to reduce physical distance to the user",
          "Increase image compression levels (aim for < 100kb for LCP)",
        ],
      },
      font: {
        reasons: [
          "Font file includes unused glyphs (no subsetting)",
          "Using older formats like TTF or OTF instead of WOFF2",
          "Slow server response or high network latency",
          "Missing Cache-Control headers causing repeated downloads",
        ],
        solutions: [
          "Subset the font to include only required character sets",
          "Convert and serve only WOFF2 format",
          "Implement a long-term caching strategy (max-age=31536000)",
          "Use a faster Font CDN or self-host on a high-perf server",
        ],
      },
    },
    render_delay: {
      image: {
        reasons: [
          "Main thread is busy with heavy JavaScript execution",
          "Large image decoding is blocking the paint process",
          "Missing width/height attributes causing layout shifts",
          "Image is hidden behind a complex CSS filter or transform",
        ],
        solutions: [
          "Add decoding='async' to the image tag",
          "Minimize or defer non-critical JS during initial load",
          "Ensure width and height attributes are explicitly set",
          "Reduce CSS selector complexity affecting the image container",
        ],
      },
      font: {
        reasons: [
          "font-display is not set to 'swap' or 'fallback'",
          "JavaScript execution is blocking the rendering of text",
          "The browser is waiting for the font to avoid FOIT",
          "Heavy layout recalculations are occurring during font swap",
        ],
        solutions: [
          "Add font-display: swap to your @font-face CSS",
          "Reduce render-blocking JavaScript in the <head>",
          "Optimize the Critical CSS path for text blocks",
          "Ensure the fallback system font has similar metrics (size-adjust)",
        ],
      },
    },
  };

  const result = diagnostics[phase][asset_type];

  return {
    reasons: result.reasons,
    solutions: result.solutions,
  };
}
