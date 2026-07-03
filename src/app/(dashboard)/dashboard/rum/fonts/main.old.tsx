"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSiteContext } from "../../siteContext";
import {
  InfoIcon,
  Type,
  Monitor,
  Smartphone,
  Tablet,
  SortDesc,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Link,
} from "lucide-react";
import TooltipIcon from "@/components/theme/customTooltip";
import {
  CustomTooltip,
  LoadingAnimation,
  PrimaryToolbar,
} from "@/components/theme";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import { cwv_ranges } from "../cwvRanges";

interface FontMetric {
  device: string;
  font_family: string;
  font_weight: string;
  font_file_url: string | null;
  avg_resource_size: number | null;
  major_pages: string[];
  total_occurrences: number;
  avg_lcp: number;
  avg_render_delay: number;
  poor_lcp_percentage: number;
}

const filters = {
  Samples: "samples",
  "Average LCP": "avgLCP",
  "Render Delay": "renderDelay",
  "LCP Involvement": "lcpInvolvement",
} as const;

type SortBy = keyof typeof filters;

const tableHeadlinesArray = [
  {
    key: "Font Family",
    description:
      "The font family that contributed to page load across your site.",
  },
  {
    key: "Device",
    description: "The type of device where this font contributed to page load.",
  },
  {
    key: "Avg. LCP",
    description: "Average contribution of a font to largest contentful paint.",
  },
  {
    key: "Render Delay",
    description:
      "Time the browser waited for the font before rendering text. High values may cause 'invisible text'.",
  },
  {
    key: "Sample",
    description:
      "Number of times the font contributed to the Largest Contentful Paint.",
  },
  {
    key: "LCP Involvement",
    description:
      "Percentage contribution of this font to Largest Contentful Paint (LCP) issues across your site.",
  },
];

export default function FontAnalysis() {
  const { selectedSite, selectedDevice } = useSiteContext();
  const [fontData, setFontData] = useState<FontMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const lastFetched = useRef<string | null>(null);
  const [sortBy, setSorting] = useState<SortBy>("Samples");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cleanExpiredCache({ prefix: "font-analysis", session_Storage: false });
    if (selectedSite && lastFetched.current !== selectedSite) {
      fetchData();
      lastFetched.current = selectedSite;
    }
  }, [selectedSite]);

  const filteredFonts = useMemo(() => {
    if (!fontData) return [];
    return fontData.filter(
      (f) =>
        !selectedDevice ||
        selectedDevice === "All" ||
        f.device.toLowerCase() === selectedDevice.toLowerCase(),
    );
  }, [fontData, selectedDevice]);

  const sortedFonts = useMemo(() => {
    return sortFonts({
      fonts: filteredFonts,
      sortBy: filters[sortBy],
    });
  }, [filteredFonts, sortBy]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!selectedSite || loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <div className="px-5 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-2xl tracking-tight bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Font Diagnostics
            </h2>
            <TooltipIcon
              content="Analyzes how specific fonts impact Largest Contentful Paint (LCP) and visual stability."
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
            WEBFONT LOADING & RENDER IMPACT
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
        <div ref={ref} className="relative inline-block text-sm">
          <CustomTooltip
            content={"Sort by"}
            width="60px"
            trigger={
              <div
                className="border rounded-sm border-primary/20 px-4 py-2 bg-primary/5 cursor-pointer flex items-center gap-2"
                onClick={() => setOpen((prev) => !prev)}
              >
                <SortDesc size={14} className="text-primary/80" />
                <p>{sortBy}</p>
              </div>
            }
          />
          {open && (
            <div className="absolute right-0 mt-1 w-48 border rounded shadow bg-primary-foreground dark:bg-secondary-background z-10">
              {Object.entries(filters).map(([label]) => (
                <div
                  key={label}
                  onClick={() => {
                    setSorting(label as SortBy);
                    setOpen(false);
                  }}
                  className="p-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/30"
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </PrimaryToolbar>

      <div className="text-primary mt-4">
        <div className="w-full">
          {sortedFonts?.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-primary/60 border-b border-primary/10">
                  <th className="py-3 px-4 w-10"></th> {/* Expand arrow col */}
                  {tableHeadlinesArray?.map((x, index) => (
                    <th
                      className={`py-3 px-4 font-bold hover:text-primary/80 ${
                        x.key === "Font Family"
                          ? "text-left"
                          : x.key === "LCP Involvement" || x.key === "Sample"
                            ? "text-right"
                            : "text-center"
                      }`}
                      key={index}
                    >
                      <CustomTooltip
                        content={x.description}
                        side="left"
                        width="200px"
                        trigger={<p className="cursor-help">{x.key}</p>}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {sortedFonts.map((font, idx) => {
                  const rowId = `${font.font_family}-${font.device}-${idx}`;
                  const isExpanded = expandedRow === rowId;

                  return (
                    <React.Fragment key={rowId}>
                      <tr
                        className={`group cursor-pointer transition-colors ${isExpanded ? "bg-primary/5" : "hover:bg-primary/3"}`}
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : rowId)
                        }
                      >
                        <td className="py-4 px-4 text-center">
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-primary" />
                          ) : (
                            <ChevronRight
                              size={14}
                              className="opacity-30 group-hover:opacity-100"
                            />
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/5 rounded-md">
                              <Type size={16} className="text-primary/60" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">
                                {font.font_family}
                              </span>
                              <span className="text-[10px] opacity-40 font-mono">
                                Weight: {font.font_weight}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            {font.device === "mobile" ? (
                              <Smartphone size={14} className="opacity-40" />
                            ) : font.device === "desktop" ? (
                              <Monitor size={14} className="opacity-40" />
                            ) : (
                              <Tablet
                                size={14}
                                className="opacity-40 rotate-90"
                              />
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-4 px-6 text-center font-mono text-xs italic ${
                            font.avg_lcp < cwv_ranges.lcp[0]
                              ? "text-green-500"
                              : font.avg_lcp < cwv_ranges.lcp[1]
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {(font.avg_lcp / 1000).toFixed(2)}s
                        </td>
                        <MetricCell
                          value={font.avg_render_delay}
                          type="delay"
                        />
                        <td className="py-4 px-8 text-right text-xs">
                          {font.total_occurrences.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <ScoreBadge percentage={font.poor_lcp_percentage} />
                        </td>
                      </tr>

                      {/* EXPANDED SECTION */}
                      {isExpanded && (
                        <tr className="bg-primary/2">
                          <td
                            colSpan={7}
                            className="py-6 px-14 border-b border-primary/10"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              {/* Left: Font File */}
                              <div className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/80 flex items-center gap-2">
                                  <Link size={12} /> Font Resource URL
                                </h4>
                                {font.font_file_url ? (
                                  <a
                                    href={font.font_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-mono text-blue-500 hover:underline break-all bg-primary/5 p-3 rounded border border-primary/5"
                                  >
                                    {font.font_file_url}
                                  </a>
                                ) : (
                                  <span className="text-xs italic opacity-40">
                                    Not detected / System Font
                                  </span>
                                )}
                              </div>

                              {/* Right: Pages */}
                              <div className="flex flex-col gap-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/60 flex items-center gap-2">
                                  <Globe size={12} /> Top Affected Pages
                                </h4>
                                <div className="flex flex-col gap-1">
                                  {font.major_pages?.map((page, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="flex items-center justify-between group/link bg-primary/5 px-3 py-1.5 rounded"
                                    >
                                      <span className="text-xs font-mono opacity-70 truncate max-w-75">
                                        {page}
                                      </span>
                                      <a
                                        href={`https://${selectedSite}${page}`}
                                        target="_blank"
                                        className="opacity-0 group-hover/link:opacity-100 transition-opacity"
                                      >
                                        <ExternalLink
                                          size={12}
                                          className="text-primary/40 hover:text-primary"
                                        />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center opacity-30 text-sm italic font-medium">
              No font data detected for this selection.
            </div>
          )}
        </div>
      </div>
    </>
  );

  async function fetchData() {
    setLoading(true);
    const { response } = await cachedData({
      fn: async () => {
        const res = await fetch("/api/rum/fonts/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: selectedSite }),
        });
        const body: any = await res.json();
        return body.data;
      },
      key: `font-analysis:${selectedSite}`,
      session_Storage: false,
      ttl: 5 * 60 * 1000,
    });
    if (response) setFontData(response);
    setLoading(false);
  }
}

/**
 * Custom Metric Cell for Font stats
 */
function MetricCell({
  value,
  type,
}: {
  value: number;
  type: "delay" | "size";
}) {
  const getStyle = () => {
    if (type === "delay") {
      return value > 100
        ? "text-red-500"
        : value > 50
          ? "text-yellow-500"
          : "text-green-500";
    }
    return value > 400
      ? "text-red-500"
      : value > 200
        ? "text-yellow-500"
        : "text-green-500";
  };

  return (
    <td
      className={`py-4 px-4 text-center font-mono text-xs font-bold ${getStyle()}`}
    >
      {Math.round(value)}
      {type === "delay" ? "ms" : ""}
    </td>
  );
}

/**
 * Score Badge for Poor LCP Impact
 */
function ScoreBadge({ percentage }: { percentage: number }) {
  return (
    <div className="text-[12px] text-primary italic">{percentage}% Poor</div>
  );
}

function sortFonts({
  fonts,
  sortBy,
}: {
  fonts: FontMetric[];
  sortBy: "samples" | "avgLCP" | "renderDelay" | "lcpInvolvement";
}) {
  const sorted = {
    samples: [...fonts].sort(
      (a, b) => b.total_occurrences - a.total_occurrences,
    ),
    avgLCP: [...fonts].sort((a, b) => b.avg_lcp - a.avg_lcp),
    renderDelay: [...fonts].sort(
      (a, b) => b.avg_render_delay - a.avg_render_delay,
    ),
    lcpInvolvement: [...fonts].sort(
      (a, b) => b.poor_lcp_percentage - a.poor_lcp_percentage,
    ),
  };
  return sorted[sortBy];
}
