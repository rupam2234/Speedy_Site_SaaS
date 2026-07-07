"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { Images, Filter, Search, ExternalLink } from "lucide-react";
import {
  CustomTooltip,
  LoadingAnimation,
  PrimaryToolbar,
} from "@/components/theme";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ImageOptimizerLite, Performancetab } from ".";
import { cwv_ranges } from "../cwvRanges";
import Image from "next/image";
import { cachedData, cleanExpiredCache } from "@/components/utils";

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

export interface LcpImageMetric {
  period: string;
  domain_name: string;
  device_type: string;
  image_url: string;
  occurrence_count: number;
  avg_lcp_ms: number | null;
  min_lcp_ms: number | null;
  max_lcp_ms: number | null;
  p75_lcp_ms: number | null;
  pct_exceeding_cwv: number | null;
  avg_decoded_body_size: number | null;
  avg_element_render_delay: number | null;
  avg_height: number | null;
  avg_resource_load_delay: number | null;
  avg_resource_load_duration: number | null;
  avg_time_to_first_byte: number | null;
  avg_transfer_size: number | null;
  avg_width: number | null;
  pct_lazy: number | null;
}

type SortOption = "avg_lcp" | "occurrence";

export default function Main() {
  const [rawLcpImageData, setRawLcpImageData] = useState<LcpImageMetric[]>([]);
  const [selectedImage, setSelectedImage] = useState<LcpImageMetric | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<SortOption>("avg_lcp");
  const [filterText, setFilterText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { selectedSite, selectedDevice } = useSiteContext();

  const ref = useRef<string | null>(null); // to prevent unnecessary the lcp image api call

  useEffect(() => {
    if (!selectedSite) return;

    if (selectedSite !== ref.current) {
      fetchLcpImages();
      ref.current = selectedSite;
    }
  }, [selectedSite]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    return (bytes / 1024).toFixed(2) + " KB";
  };

  const filteredImages = rawLcpImageData.filter((x) => {
    return x.pct_exceeding_cwv !== null ? x.pct_exceeding_cwv > 0 : x;
  });

  // Recompute sorted + filtered data only when inputs change
  const lcpImageData = useMemo(() => {
    let filtered = filteredImages
      .filter((item) => item.device_type === selectedDevice || !selectedDevice)
      .filter((item) => isImageUrl(item.image_url));

    // Apply text filter if provided
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.image_url.toLowerCase().includes(lowerFilter) ||
          (item.avg_lcp_ms && item.avg_lcp_ms.toString().includes(lowerFilter)),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "avg_lcp") {
        return (
          parseFloat(b.avg_lcp_ms as unknown as string) -
          parseFloat(a.avg_lcp_ms as unknown as string)
        );
      } else {
        return b.occurrence_count - a.occurrence_count;
      }
    });

    return sorted;
  }, [filteredImages, selectedDevice, sortBy, filterText]);

  // Auto-select the first image on data change
  useEffect(() => {
    if (lcpImageData.length > 0 && !selectedImage) {
      setSelectedImage(lcpImageData[0]);
    }
  }, [lcpImageData, selectedImage]);

  const getBytesPerPixel = (metric: LcpImageMetric | null) => {
    if (
      !metric?.avg_decoded_body_size ||
      !metric?.avg_width ||
      !metric?.avg_height
    ) {
      return null;
    }
    const totalPixels = metric.avg_width * metric.avg_height;
    if (totalPixels === 0) return null;
    return metric.avg_decoded_body_size / totalPixels;
  };

  const needsOptimization = (metric: LcpImageMetric | null) => {
    const bpp = getBytesPerPixel(metric);
    if (bpp === null) {
      return !!(
        metric?.avg_decoded_body_size && metric.avg_decoded_body_size > 10000
      );
    }
    return bpp > 0.5;
  };

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  } else {
    return (
      <>
        <>
          <PrimaryToolbar
            isSticky
            defaultDateRange={30}
            enableDistribution={false}
            enableAllDevices={false}
            disableTablet={false}
          />

          <div className="flex flex-col gap-6 p-4 md:p-5 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4  border-b border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {lcpImageData?.length || 0}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    {lcpImageData?.length === 1
                      ? "image needs attention"
                      : "images need attention"}
                  </span>
                  <CustomTooltip
                    side="bottom"
                    content={
                      <div className="space-y-3">
                        <p>
                          These images are contributing to a Largest Contentful
                          Paint (LCP) above 2.5 seconds.
                        </p>
                        <p>
                          Slow-loading images aren&apos;t always large or poorly
                          optimized. Performance issues can also be caused by
                          render delays (such as render-blocking resources) or
                          slow server response times.
                        </p>
                        <p>
                          Select an image to explore the underlying causes and
                          performance details.
                        </p>
                      </div>
                    }
                  />
                </div>
              </div>

              <div className="flex items-center w-full md:w-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 overflow-hidden">
                <div className="relative flex-1 md:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search images..."
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

            {/* Main layout: master list + single wide detail pane */}
            <div className="grid grid-cols-1 md:relative lg:grid-cols-12 gap-6">
              {/* Image list */}
              <div className="lg:col-span-4 space-y-4">
                <div className="space-y-3">
                  {lcpImageData.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      {isLoading
                        ? "Loading images..."
                        : "No LCP image data found"}
                    </div>
                  ) : (
                    lcpImageData.map((metric) => (
                      <div
                        key={metric.image_url}
                        onClick={() => setSelectedImage(metric)}
                        className={`flex gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                          selectedImage?.image_url === metric.image_url
                            ? "border-primary/20 bg-primary/5 dark:bg-secondary-background"
                            : "border-primary/5 hover:bg-primary/5"
                        }`}
                      >
                        <Image
                          src={metric.image_url}
                          alt="LCP image"
                          className="rounded-sm border object-cover shrink-0"
                          loading="lazy"
                          width={40}
                          height={40}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-primary/80 truncate">
                            {metric.image_url.split("/").pop() ||
                              "Unknown Image"}
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                            <span>
                              Occurred: {metric.occurrence_count} times
                            </span>

                            <div className="flex items-center gap-1 border shadow-sm border-primary/10 rounded-2xl px-2">
                              Avg LCP
                              <span
                                className={`font-medium ${(() => {
                                  const lcp =
                                    typeof metric?.avg_lcp_ms === "number"
                                      ? metric.avg_lcp_ms
                                      : 0;

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
                                {metric?.avg_lcp_ms ?? "N/A"} ms
                              </span>
                            </div>

                            {metric.avg_transfer_size ? (
                              <span className="border shadow-sm border-primary/10 rounded-2xl px-2 font-medium">
                                {formatFileSize(metric.avg_decoded_body_size)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Detail pane */}
              <div className="lg:col-span-8 md:sticky md:top-25 md:self-start">
                {selectedImage ? (
                  <div className="space-y-5">
                    {/* Preview + quick facts */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="sm:w-56 shrink-0 overflow-hidden rounded-sm border flex items-center justify-center bg-primary/5 dark:bg-secondary-background">
                        <Image
                          src={selectedImage.image_url}
                          alt="Selected LCP image"
                          className="w-full h-40 object-contain"
                          width={300}
                          height={192}
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
                        <div className="flex gap-2 items-start">
                          <ExternalLink size={18} />
                          <Link
                            href={selectedImage.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline break-all"
                          >
                            {selectedImage.image_url}
                          </Link>
                        </div>

                        <div className="flex flex-wrap gap-5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Lazy Loaded
                            </span>
                            {selectedImage.pct_lazy === 0 ? (
                              <Badge variant="outline" className="text-red-600">
                                No
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-green-600"
                              >
                                Yes
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Exceeding CWV
                            </span>
                            <span
                              className={`font-medium ${
                                parseFloat(
                                  selectedImage.pct_exceeding_cwv as any,
                                ) > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {selectedImage.pct_exceeding_cwv}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance — full width */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        Performance
                      </h3>
                      <Performancetab
                        avg_transfer_size={selectedImage.avg_transfer_size}
                        avg_decoded_body_size={
                          selectedImage.avg_decoded_body_size
                        }
                        avg_resource_load_delay={
                          selectedImage.avg_resource_load_delay
                        }
                        avg_resource_load_duration={
                          selectedImage.avg_resource_load_duration
                        }
                        avg_element_render_delay={
                          selectedImage.avg_element_render_delay
                        }
                        avg_time_to_first_byte={
                          selectedImage.avg_time_to_first_byte
                        }
                        isLazyloaded={selectedImage.pct_lazy !== 0}
                        poor_lcp={selectedImage.pct_exceeding_cwv}
                        sample={selectedImage.occurrence_count}
                      />
                    </div>

                    {needsOptimization(selectedImage) && (
                      <div className="space-y-3 py-4 border-t border-primary/10">
                        <ImageOptimizerLite
                          imageUrl={selectedImage.image_url}
                        />
                      </div>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="h-50 w-full bg-primary/5 rounded-sm animate-pulse" />
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    <Images className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select an image to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      </>
    );
  }

  async function fetchLcpImages() {
    setIsLoading(true);

    const key = `lcp-images:${selectedSite}`;

    const { response } = await cachedData({
      fn: async () => {
        const res = await fetch("/api/rum/lcp-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: selectedSite,
          }),
        });

        const body: any = await res.json();

        if (!res.ok) {
          throw new Error(body.message);
        }

        return body;
      },
      key: key,
      session_Storage: true,
      ttl: 5 * 60 * 1000,
    });

    setRawLcpImageData(response.data);

    setIsLoading(false);
    // clean up silently
    cleanExpiredCache({ prefix: "lcp-images", session_Storage: true });
  }

  function isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url);
  }
}
