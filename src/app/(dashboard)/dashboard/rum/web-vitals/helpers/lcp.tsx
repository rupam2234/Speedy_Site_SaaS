"use client";

import React, { useState, useMemo, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ZapIcon,
  StarsIcon,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useSiteContext } from "../../../siteContext";
import { CustomTooltip, LoadingAnimation } from "@/components/theme";
import { ColorCodes } from "./types";

const getVitalColor = (ms: number) => {
  if (ms <= 2500) return "text-emerald-500";
  if (ms <= 4000) return "text-amber-500";
  return "text-red-500";
};

export interface Contributor {
  device_type: "Desktop" | "Mobile" | "Tablet" | string;

  element_target: string;
  page_url: string;

  lcp_asset_url: string | null;

  font_family: string | null;
  font_weight: string | number | null;
  font_size: string | null;

  network_transfer_bytes: number | null;
  memory_usage_bytes: number | null;
  ttfb_ms: number | null;
  loading_priority: "high" | "low" | "auto" | string | null;
  device_memory_gb: string | number | null;

  occurrence_count: number;

  avg_lcp_value: number;
  p75_lcp_value: number;

  avg_resource_load_delay: number;
  avg_resource_load_duration: number;
  avg_element_render_delay: number;

  top_3_render_blockers: string | null;

  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
}

export type AnalysisType<T> = {
  metric: "LCP" | "INP" | "CLS" | "TTFB";
  data: T;
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
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string[] | null>(null);

  useEffect(() => {
    if (contributors.length > 0) {
      setLoading(false); // data arrived -> stop immediately
      return;
    }

    const timer = setTimeout(() => {
      setLoading(false); // fallback after 10s
    }, 10000);

    return () => clearTimeout(timer);
  }, [contributors]);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => {
      setCopied(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [copied]);

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

  if (loading && contributors.length > 0) {
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
      {contributors.length === 0 && !loading && (
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
          const ttfb = item.ttfb_ms || 0;
          const totalPhases = delay + load + render + ttfb;

          const avg = item.needs_improvement_count || 0;
          const poor = item.poor_count || 0;

          const exceededGoodLcp = avg + poor;

          const max = Math.max(
            item?.avg_resource_load_delay ?? 0,
            item.avg_resource_load_duration ?? 0,
            item.avg_element_render_delay ?? 0,
          );

          const hasRenderDelay =
            (max === item.avg_resource_load_delay ||
              max === item.avg_element_render_delay) &&
            item.top_3_render_blockers !== null;

          const renderBlockingAssets =
            item.top_3_render_blockers &&
            item.top_3_render_blockers
              .split("\n")
              .map((line) => {
                const match = line.match(/^(.*?) \((?:Finish: )?(\d+)ms\)$/);
                if (!match) return null;

                return {
                  asset: match[1],
                  timing: Number(match[2]),
                };
              })
              .filter(Boolean);

          return (
            <div
              key={i}
              className="group border border-neutral-300 dark:border-neutral-700 rounded-sm bg-white dark:bg-secondary-background overflow-hidden transition-all hover:shadow-md"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* 1. LCP Metric Column (Left) */}
                <div className="lg:col-span-2 p-5 bg-neutral-50 dark:bg-neutral-900/40 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center lg:items-start">
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
                  <div className="space-y-3  dark:bg-neutral-950">
                    <div className="group flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          Element Target
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.element_target);
                            toast.success("Copied to clipboard");
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 transition-all"
                          title="Copy selector"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <code className="text-[13px] font-mono leading-relaxed text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-2 py-1.5 rounded border border-blue-100 dark:border-blue-900/50 break-all">
                        {item.element_target}
                      </code>
                    </div>

                    {/* Page Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-xs font-medium text-neutral-500">
                        Affected Page
                      </span>
                      <Link
                        href={`https://${selectedSite}${item.page_url}`}
                        target="_blank"
                        className="group/link flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <span className="truncate max-w-45">
                          {item.page_url}
                        </span>
                        <ExternalLink
                          size={12}
                          className="text-neutral-400 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform"
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center">
                    {item.lcp_asset_url ? (
                      <Link
                        href={item.lcp_asset_url}
                        target="_blank"
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1.5"
                      >
                        View Asset Source
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
                          {item.network_transfer_bytes && (
                            <span className="ml-1 opacity-70">
                              {(item.network_transfer_bytes / 1024).toFixed(0)}
                              KB
                            </span>
                          )}
                        </div>
                      )
                    )}
                    <p className="text-xs text-primary/80">
                      {exceededGoodLcp} out of {item.occurrence_count} times
                      exceeded good LCP (2.5 seconds)
                    </p>
                  </div>
                </div>

                {/* 3. Debugging Timeline (Right) */}
                <div className="lg:col-span-4 p-5 bg-neutral-50/50 dark:bg-neutral-900/20 lg:border-l border-neutral-200 dark:border-neutral-800">
                  <div className="flex gap-2 items-end mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Asset Timings
                    </span>
                    <span className="text-xs text-primary/80">
                      (Total: {totalPhases?.toFixed(2)} ms)
                    </span>
                  </div>

                  <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-sm flex overflow-hidden shadow-inner">
                    <div
                      title={`Avg. TTFB: ${ttfb}ms\nShare: ${((ttfb / totalPhases) * 100).toFixed(1)}%\nTime To First Byte from server.`}
                      style={{ width: `${(ttfb / totalPhases) * 100}%` }}
                      className="h-full bg-green-600 dark:bg-neutral-600 border-r cursor-pointer border-black/5"
                    />
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
                      className="h-full bg-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ZapIcon size={12} className="text-neutral-400" />
                      <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">
                        Resource Metrics
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Network Transfer */}
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-400 uppercase font-bold">
                          Transfer Size
                        </span>
                        <span
                          className={`text-xs font-mono font-semibold truncate ${getTransferSizeColor({ size: item.network_transfer_bytes ? item.network_transfer_bytes : 0, downloadTime: item.avg_resource_load_duration })}`}
                        >
                          {item.network_transfer_bytes
                            ? `${(item.network_transfer_bytes / 1024).toFixed(1)}KB`
                            : "--"}
                        </span>
                      </div>

                      {/* Decoded Size */}
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-400 uppercase font-bold">
                          Asset Size
                        </span>
                        <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                          {item.memory_usage_bytes
                            ? `${(item.memory_usage_bytes / 1024).toFixed(1)}KB`
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center mt-3 gap-2">
                    {hasRenderDelay && (
                      <CustomTooltip
                        width="550px"
                        trigger={
                          <div className="bg-primary/20 hover:bg-green-500/40 text-xs text-primary/80 px-2 py-0.5 rounded-sm">
                            Render Blocking Assets
                          </div>
                        }
                        content={
                          <div className="p-2 space-y-3">
                            <section className="space-y-1">
                              {renderBlockingAssets &&
                                renderBlockingAssets.length > 0 && (
                                  <>
                                    <p className="text-primary-foreground/80">
                                      We found the following render-blocking
                                      assets relevent to LCP of this element &
                                      similar across thesite. You can optimize
                                      these to instantly improve LCP of the
                                      current element.
                                    </p>
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="py-2 px-3 font-medium">
                                            Asset
                                          </th>
                                          <th className="py-2 px-3 font-medium">
                                            Finished loading at
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {renderBlockingAssets.map(
                                          (x, index) => {
                                            const timing = x?.timing ?? 0;

                                            const getSeverity = () => {
                                              if (timing > 2000) return "High";
                                              if (timing > 1000)
                                                return "Medium";
                                              return "Low";
                                            };

                                            const getRecommendation = (
                                              asset: string,
                                            ) => {
                                              if (!asset)
                                                return "Review asset impact on performance";

                                              const url = asset.split("?")[0];

                                              const isThirdParty =
                                                url.includes(
                                                  "google-analytics",
                                                ) ||
                                                url.includes(
                                                  "googletagmanager",
                                                ) ||
                                                url.includes("facebook.net") ||
                                                url.includes("doubleclick") ||
                                                url.includes("ads") ||
                                                (!url.startsWith("/") &&
                                                  !url.includes(
                                                    window?.location?.host,
                                                  ));

                                              // Fonts
                                              if (
                                                url.includes(
                                                  "fonts.googleapis.com",
                                                ) ||
                                                url.includes(
                                                  "fonts.gstatic.com",
                                                )
                                              ) {
                                                return "Preconnect and preload fonts; use font-display: swap";
                                              }

                                              if (
                                                /\.(woff2?|ttf|otf)$/.test(url)
                                              ) {
                                                return "Preload fonts and use font-display: swap";
                                              }

                                              // CSS
                                              if (url.endsWith(".css")) {
                                                return "Inline critical CSS and defer non-critical stylesheets";
                                              }

                                              // JavaScript
                                              if (url.endsWith(".js")) {
                                                if (isThirdParty) {
                                                  return "Load asynchronously and delay execution until after main content";
                                                }

                                                if (
                                                  url.includes("chunk") ||
                                                  url.includes("vendor")
                                                ) {
                                                  return "Split routes/chunks and lazy-load non-critical modules";
                                                }

                                                return "Use defer/async and load only when needed";
                                              }

                                              // Images
                                              if (
                                                /\.(png|jpg|jpeg|webp|avif|gif|svg)$/.test(
                                                  url,
                                                )
                                              ) {
                                                return "Compress and serve next-gen formats; lazy-load offscreen images";
                                              }

                                              // Third-party fallback
                                              if (isThirdParty) {
                                                return "Load after critical content, consider async or deferred injection";
                                              }

                                              return "Defer or lazy-load if non-critical; evaluate impact on LCP and interaction delay";
                                            };

                                            const isOpen =
                                              expandedRow === index;

                                            return (
                                              <Fragment key={index}>
                                                <tr
                                                  key={index}
                                                  className="border-b last:border-none hover:bg-primary-foreground/20"
                                                  onClick={() => {
                                                    setExpandedRow(
                                                      isOpen ? null : index,
                                                    );
                                                  }}
                                                >
                                                  <td className="py-2 px-3 truncate max-w-80">
                                                    {x?.asset}
                                                  </td>
                                                  <td className="py-2 px-3 text-primary-foreground/50 dark:text-primary/50 whitespace-nowrap">
                                                    {x?.timing} ms
                                                  </td>
                                                  <td>
                                                    {isOpen ? (
                                                      <ChevronUp size={15} />
                                                    ) : (
                                                      <ChevronDown size={15} />
                                                    )}
                                                  </td>
                                                </tr>
                                                {isOpen && (
                                                  <tr className="">
                                                    <td
                                                      colSpan={2}
                                                      className="px-3 py-3"
                                                    >
                                                      <div className="text-xs space-y-1">
                                                        <p>
                                                          <span className="font-medium">
                                                            Severity:
                                                          </span>{" "}
                                                          <span
                                                            className={
                                                              timing > 2000
                                                                ? "text-red-500"
                                                                : timing > 1000
                                                                  ? "text-yellow-500"
                                                                  : "text-green-500"
                                                            }
                                                          >
                                                            {getSeverity()}
                                                          </span>
                                                        </p>

                                                        <p className="text-primary-foreground/80 dark:text-primary/60">
                                                          {getRecommendation(
                                                            x?.asset !==
                                                              undefined
                                                              ? x.asset
                                                              : "",
                                                          )}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                          Copy asset url:{" "}
                                                          <Copy
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (x?.asset) {
                                                                navigator.clipboard.writeText(
                                                                  x.asset,
                                                                );
                                                                setCopied(
                                                                  index,
                                                                );
                                                              }
                                                            }}
                                                            size={14}
                                                            className="text-primary-foreground/60 cursor-pointer"
                                                          />
                                                          {copied !== null &&
                                                            copied ===
                                                              index && (
                                                              <p className="text-green-400">
                                                                Copied
                                                              </p>
                                                            )}
                                                        </div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )}
                                              </Fragment>
                                            );
                                          },
                                        )}
                                      </tbody>
                                    </table>
                                  </>
                                )}
                            </section>
                          </div>
                        }
                      />
                    )}

                    <button
                      onClick={() => {
                        AnalyzeContributors({
                          input: {
                            metric: "LCP",
                            data: item !== undefined && item,
                          },
                          index: i,
                        });
                      }}
                      className="rounded-sm bg-purple-600 text-xs px-3 py-0.5 cursor-pointer hover:bg-purple-800 text-primary-foreground font-medium flex gap-2 items-center"
                    >
                      <StarsIcon size={14} className="fill-yellow-200" />{" "}
                      Analyze
                    </button>
                  </div>
                  {analyzing === i && (
                    <div className="mt-2 z-20 border text-sm border-primary/20 bg-white rounded-sm shadow-xm p-4">
                      {analysisResult !== null && analysisResult?.length > 0 ? (
                        <div className="px-2 py-0.5 rounded-xs text-xs">
                          <ol className="list-disc space-y-2">
                            {analysisResult.map((x, index) => (
                              <li key={index}>{x}</li>
                            ))}
                          </ol>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-0.5 text-xs">
                          <LoaderCircle
                            className="animate-spin text-primary/20"
                            size={14}
                          />
                          <span>Analyzing asset timings...</span>
                        </div>
                      )}

                      <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-r border-b border-primary/20 rotate-225" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  async function AnalyzeContributors<T>({
    input,
    index,
  }: {
    input: AnalysisType<T>;
    index: number;
  }) {
    setAnalyzing(index);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/analysis/contributors", {
        method: "POST",
        headers: {
          "Content-Type": "apllication/json",
        },
        body: JSON.stringify({ metric: input.metric, data: input.data }),
      });

      const body: any = await res.json();

      if (!res.ok) {
        setAnalysisResult(null);
        throw new Error(body.message ?? "Couldn't get analysis");
      }
      // setAnalyzing(null);

      setAnalysisResult(body?.json?.fixes);
    } catch (error: any) {
      setAnalyzing(null);
      setAnalysisResult(null);
      console.error(error.message ?? "UNexpacted Error");
    }
  }
}

/**
 * determines the color for transfersize of a LCP asset
 */
function getTransferSizeColor({
  size,
  downloadTime,
}: {
  size: number;
  downloadTime: number;
}) {
  const sizeKB = size / 1024;

  const thresholds = {
    size: { excellent: 100, good: 200, heavy: 500 },
    timing: { excellent: 500, good: 1000, average: 1500 },
  };

  /**
   * CASE: POOR
   * If the file is too heavy (>500KB) -> ALWAYS POOR (due to memory/decoding cost)
   * If the download takes > 1.5s -> ALWAYS POOR (ruins LCP budget)
   */
  if (
    sizeKB >= thresholds.size.heavy ||
    downloadTime >= thresholds.timing.average
  ) {
    return ColorCodes.poor;
  }

  /**
   * CASE: SMALL BUT SLOW (Latency/CDN Bottleneck)
   * If size is tiny (<100KB) but takes > 1s to download.
   * The developer did their job, but the server/CDN is failing.
   */
  if (
    sizeKB < thresholds.size.excellent &&
    downloadTime > thresholds.timing.good
  ) {
    return ColorCodes.average; // Or ColorCodes.poor depending on how strict you are
  }

  /**
   * CASE: GOOD / EXCELLENT
   * File is within reasonable limits and downloaded promptly.
   */
  if (
    sizeKB <= thresholds.size.good &&
    downloadTime <= thresholds.timing.good
  ) {
    return sizeKB < thresholds.size.excellent
      ? ColorCodes.good
      : ColorCodes.good;
  }

  // Fallback for middle-ground (e.g., 300KB file in 800ms)
  return ColorCodes.average;
}
