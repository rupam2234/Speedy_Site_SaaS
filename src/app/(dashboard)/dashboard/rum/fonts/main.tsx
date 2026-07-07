"use client";

import {
  LoadingAnimation,
  PrimaryToolbar,
  CustomTooltip,
} from "@/components/theme";
import { cachedData, cleanExpiredCache } from "@/components/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { CachePrefix } from "@/data-types";
import {
  Type,
  Search,
  Filter,
  Monitor,
  Tablet,
  Smartphone,
  FileType2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cwv_ranges } from "../cwvRanges";

const Badge = ({
  variant = "default",
  children,
  className = "",
}: {
  variant?: "default" | "secondary" | "destructive" | "outline";
  children: React.ReactNode;
  className?: string;
}) => {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

  let variantClasses = "";
  switch (variant) {
    case "default":
      variantClasses = "bg-blue-500 text-white";
      break;
    case "secondary":
      variantClasses =
        "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      break;
    case "destructive":
      variantClasses = "bg-red-500 text-white";
      break;
    case "outline":
      variantClasses =
        "border border-gray-300 bg-transparent text-gray-800 dark:border-gray-600 dark:text-gray-200";
      break;
  }

  return (
    <span className={`${baseClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

export interface FontMetric {
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

type SortOption = "avg_lcp" | "occurrence";

const deviceIcon = (device: string) => {
  switch (device) {
    case "desktop":
      return <Monitor size={13} />;
    case "tablet":
      return <Tablet size={13} />;
    default:
      return <Smartphone size={13} />;
  }
};

type FontExtension = "woff2" | "woff" | "ttf" | "otf" | "eot" | "unknown";

const getFontExtension = (url: string | null): FontExtension => {
  if (!url) return "unknown";
  const match = url.toLowerCase().match(/\.(woff2|woff|ttf|otf|eot)(\?|$)/);
  if (!match) return "unknown";
  return match[1] as FontExtension;
};

const extensionAdvice: Record<
  FontExtension,
  { label: string; isOptimal: boolean; message: string }
> = {
  woff2: {
    label: "WOFF2",
    isOptimal: true,
    message:
      "WOFF2 is the most compressed, widely-supported web font format. No format change needed.",
  },
  woff: {
    label: "WOFF",
    isOptimal: false,
    message:
      "WOFF is supported everywhere but typically 15-25% larger than WOFF2 for the same glyphs. Re-export as WOFF2 for a quick size reduction.",
  },
  ttf: {
    label: "TTF",
    isOptimal: false,
    message:
      "TTF is uncompressed and often 30-50% larger than a WOFF2 of the same font. Converting to WOFF2 is a fast win with no glyph loss.",
  },
  otf: {
    label: "OTF",
    isOptimal: false,
    message:
      "OTF is uncompressed like TTF. Converting to WOFF2 preserves the same glyphs at a fraction of the size.",
  },
  eot: {
    label: "EOT",
    isOptimal: false,
    message:
      "EOT is a legacy IE-only format and is usually unnecessary for modern browser support. Consider serving WOFF2 instead.",
  },
  unknown: {
    label: "Unknown",
    isOptimal: false,
    message:
      "Couldn't determine the font format from the URL. Verify the file is served as WOFF2 for the best compression.",
  },
};

function getWeightUsage(allFontData: FontMetric[], fontFamily: string) {
  const entriesForFamily = allFontData.filter(
    (f) => f.font_family === fontFamily,
  );

  const distinctWeights = [
    ...new Set(entriesForFamily.map((f) => f.font_weight)),
  ];

  return {
    weightsUsed: distinctWeights,
    isSingleWeight: distinctWeights.length === 1,
  };
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  return (bytes / 1024).toFixed(2) + " KB";
};

export function FontMain() {
  const { selectedSite, selectedDevice } = useSiteContext();

  const [rawFontData, setRawFontData] = useState<FontMetric[]>([]);
  const [selectedFont, setSelectedFont] = useState<FontMetric | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("avg_lcp");
  const [filterText, setFilterText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const ref = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedSite) return;

    if (selectedSite !== ref.current) {
      fetchFontAnalysis();
      ref.current = selectedSite;
    }
  }, [selectedSite]);

  const fontData = useMemo(() => {
    let filtered = [...rawFontData];

    filtered = filtered.filter(
      (item) => item.device.toLowerCase() === selectedDevice.toLowerCase(),
    );

    return filtered.sort((a, b) => {
      if (sortBy === "avg_lcp") {
        return b.avg_lcp - a.avg_lcp;
      }
      return b.total_occurrences - a.total_occurrences;
    });
  }, [rawFontData, sortBy, filterText, selectedDevice]);

  useEffect(() => {
    if (fontData.length > 0 && !selectedFont) {
      setSelectedFont(fontData[0]);
    }
  }, [fontData, selectedFont]);

  // Suggestions derived for the currently selected font
  const suggestions = useMemo(() => {
    if (!selectedFont) return null;

    const extension = getFontExtension(selectedFont.font_file_url);
    const extInfo = extensionAdvice[extension];

    const { weightsUsed, isSingleWeight } = getWeightUsage(
      rawFontData,
      selectedFont.font_family,
    );

    return {
      extension,
      extInfo,
      weightsUsed,
      isSingleWeight,
    };
  }, [selectedFont, rawFontData]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <PrimaryToolbar
        isSticky
        defaultDateRange={7}
        enableDistribution={false}
        enableAllDevices={false}
        disableCalender={false}
      />

      <div className="flex flex-col gap-6 p-4 md:p-5 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50">
          {/* Left */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {fontData?.length || 0}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">
                {fontData?.length === 1
                  ? "font affecting load"
                  : "fonts affecting load"}
              </span>
              <CustomTooltip
                side="bottom"
                content={
                  <div className="space-y-3">
                    <p>
                      Each row is a font/device combination detected on your
                      pages, along with its impact on Largest Contentful Paint
                      (LCP).
                    </p>
                    <p>
                      Custom webfonts that block rendering tend to add the most
                      delay. System fonts (no file URL) load instantly but are
                      shown for comparison.
                    </p>
                    <p>
                      Select a row to see which pages use it and how much render
                      delay it&apos;s adding.
                    </p>
                  </div>
                }
              />
            </div>
          </div>

          {/* Right: unified search + sort toolbar */}
          <div className="flex items-center w-full md:w-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 overflow-hidden">
            <div className="relative flex-1 md:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search fonts..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="h-9 w-auto md:w-36 border-0 bg-transparent shadow-none gap-1.5 focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Filter className="w-3 h-3 opacity-50" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avg_lcp">LCP</SelectItem>
                <SelectItem value="occurrence">Frequency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main layout: master list + detail pane */}
        <div className="grid grid-cols-1 relative lg:grid-cols-12 gap-6">
          {/* Font list */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-3">
              {fontData.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  {isLoading ? "Loading fonts..." : "No font data found"}
                </div>
              ) : (
                fontData.map((metric, i) => (
                  <div
                    key={`${metric.font_family}-${metric.device}-${i}`}
                    onClick={() => setSelectedFont(metric)}
                    className={`flex gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                      selectedFont?.font_family === metric.font_family &&
                      selectedFont?.device === metric.device
                        ? "border-primary/20 bg-primary/5 dark:bg-secondary-background"
                        : "border-primary/5 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-sm border bg-primary/5 shrink-0 text-primary/70">
                      <Type size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-primary/80 truncate">
                          {metric.font_family}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-primary/10 rounded-full px-1.5 py-0.5 shrink-0">
                          {deviceIcon(metric.device)}
                          {metric.device}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1.5">
                        <span>Occurred: {metric.total_occurrences} times</span>

                        <div className="flex items-center gap-1 border shadow-sm border-primary/10 rounded-2xl px-2">
                          Avg LCP
                          <span
                            className={`font-medium ${(() => {
                              const lcp = metric.avg_lcp ?? 0;
                              if (lcp < cwv_ranges.lcp[0])
                                return "text-green-500";
                              if (
                                lcp >= cwv_ranges.lcp[0] &&
                                lcp < cwv_ranges.lcp[1]
                              )
                                return "text-yellow-500";
                              return "text-red-300";
                            })()}`}
                          >
                            {metric.avg_lcp?.toFixed(0) ?? "N/A"} ms
                          </span>
                        </div>

                        {metric.avg_resource_size ? (
                          <span className="border shadow-sm border-primary/10 rounded-2xl px-2 font-medium">
                            {formatFileSize(metric.avg_resource_size)}
                          </span>
                        ) : (
                          <span className="border shadow-sm border-primary/10 rounded-2xl px-2 font-medium text-muted-foreground">
                            System font
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail pane */}
          <div className="lg:col-span-8 sticky top-10 self-start">
            {selectedFont ? (
              <div className="space-y-5">
                {/* Preview + quick facts */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="sm:w-56 shrink-0 overflow-hidden rounded-sm border flex flex-col items-center justify-center bg-primary/5 dark:bg-secondary-background p-4 gap-1">
                    <span
                      className="text-3xl text-foreground"
                      style={{ fontFamily: selectedFont.font_family }}
                    >
                      Aa
                    </span>
                    <span className="text-[11px] text-muted-foreground text-center truncate w-full">
                      {selectedFont.font_family} · {selectedFont.font_weight}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
                    <div className="flex gap-2 items-start">
                      <FileType2 size={18} className="shrink-0 mt-0.5" />
                      {selectedFont.font_file_url ? (
                        <a
                          href={selectedFont.font_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline break-all"
                        >
                          {selectedFont.font_file_url}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          System font — no file loaded
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Device</span>
                        <Badge variant="outline" className="capitalize">
                          {selectedFont.device}
                        </Badge>
                      </div>

                      {suggestions?.extension !== "unknown" && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Format</span>
                          <Badge
                            variant="outline"
                            className={
                              suggestions?.extInfo.isOptimal
                                ? "text-green-600 border-green-200"
                                : "text-amber-600 border-amber-200"
                            }
                          >
                            {suggestions?.extInfo.label}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Exceeding CWV
                        </span>
                        <span
                          className={`font-medium ${
                            selectedFont.poor_lcp_percentage > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {selectedFont.poor_lcp_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Performance
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-sm border border-primary/10 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        Avg LCP
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {selectedFont.avg_lcp?.toFixed(0)} ms
                      </p>
                    </div>
                    <div className="rounded-sm border border-primary/10 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        Render Delay
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {selectedFont.avg_render_delay?.toFixed(0)} ms
                      </p>
                    </div>
                    <div className="rounded-sm border border-primary/10 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        File Size
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {selectedFont.avg_resource_size
                          ? formatFileSize(selectedFont.avg_resource_size)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-sm border border-primary/10 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        Occurrences
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {selectedFont.total_occurrences}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Optimization suggestions */}
                {selectedFont.font_file_url && suggestions && (
                  <div className="space-y-3 py-4 border-t border-primary/10">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground">
                        Optimization Suggestions
                      </h3>
                      <CustomTooltip
                        side="top"
                        content={
                          <p>
                            These checks are based on the font format detected
                            in the file URL and the weights observed across your
                            tracked page views. They&apos;re signals, not
                            guarantees — verify against your full site before
                            requesting a new font file.
                          </p>
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      {/* Format / extension check */}
                      <div
                        className={`flex items-start gap-2 text-xs rounded-sm px-3 py-2 border ${
                          suggestions.extInfo.isOptimal
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200/60 dark:border-green-900/40 text-green-800 dark:text-green-300"
                            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {suggestions.extInfo.isOptimal ? (
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle
                            size={14}
                            className="shrink-0 mt-0.5"
                          />
                        )}
                        <span>
                          <strong>{suggestions.extInfo.label} format:</strong>{" "}
                          {suggestions.extInfo.message}
                        </span>
                      </div>

                      {/* Weight usage check */}
                      {suggestions.isSingleWeight ? (
                        <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-sm px-3 py-2">
                          <AlertTriangle
                            size={14}
                            className="shrink-0 mt-0.5"
                          />
                          <span>
                            Only weight{" "}
                            <strong>{suggestions.weightsUsed[0]}</strong> was
                            observed for this font across all tracked pages and
                            devices. If no other weight is used elsewhere on the
                            site, you can load only required weight to reduce
                            size.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-xs bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-900/40 text-green-800 dark:text-green-300 rounded-sm px-3 py-2">
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                          <span>
                            Multiple weights (
                            {suggestions.weightsUsed.join(", ")}) are in active
                            use for this font family. Just make sure your font
                            file not loading unnecessary font-weights to improve
                            font file loading speed.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pages using this font */}
                <div className="space-y-3 py-4 border-t border-primary/10">
                  <h3 className="text-sm font-semibold text-foreground">
                    Font found on these pages
                  </h3>
                  <div className="space-y-1.5">
                    {selectedFont.major_pages.map((page, idx) => (
                      <a
                        key={`${page}-${idx}`}
                        href={page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-primary/80 hover:underline truncate"
                      >
                        {page}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="h-50 w-full bg-primary/5 rounded-sm animate-pulse" />
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a font to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  async function fetchFontAnalysis() {
    setIsLoading(true);

    const key = `${CachePrefix["FONT-ANALYSIS"]}:${selectedSite}`;

    try {
      const { response } = await cachedData({
        fn: async () => {
          const res = await fetch("/api/rum/fonts/analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: selectedSite }),
          });

          const body: any = await res.json();

          if (!res.ok) {
            throw new Error(body?.message ?? "Error fetching font analysis");
          }

          return body;
        },
        key,
        session_Storage: true,
        ttl: 5 * 60 * 1000,
      });

      setRawFontData(response?.data ?? []);
    } catch (error: any) {
      console.error(error.message ?? "Error fetching font analysis");
    } finally {
      setIsLoading(false);
      cleanExpiredCache({ prefix: "font-analysis", session_Storage: true });
    }
  }
}
