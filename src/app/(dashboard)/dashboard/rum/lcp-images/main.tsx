"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { Images, Filter, Search } from "lucide-react";
import {
  LoadingAnimation,
  PrimaryToolbar,
  useIsMobile,
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
import { cachedData } from "@/components/utils";

// Custom Badge component
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

export default function Main() {
  const [rawLcpImageData, setRawLcpImageData] = useState<LcpImageMetric[]>([]);
  const [selectedImage, setSelectedImage] = useState<LcpImageMetric | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<"avg_lcp" | "occurrence">("avg_lcp");
  const [filterText, setFilterText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { selectedSite, selectedDevice } = useSiteContext();

  const isMobile = useIsMobile();

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

  // Recompute sorted + filtered data only when inputs change
  const lcpImageData = useMemo(() => {
    let filtered = rawLcpImageData
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
  }, [rawLcpImageData, selectedDevice, sortBy, filterText]);

  // Auto-select the first image on data change
  useEffect(() => {
    if (lcpImageData.length > 0) {
      setSelectedImage(lcpImageData[0]);
    } else {
      setSelectedImage(null);
    }
  }, [lcpImageData]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  } else {
    return (
      <>
        {isMobile ? (
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
              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <div className="flex flex-wrap items-center text-primary/80 gap-2">
                  <Images />
                  <h1 className="text-lg md:text-xl font-bold">
                    Critical Images
                  </h1>

                  <span className="hidden md:inline">|</span>

                  {lcpImageData.length > 0 ? (
                    <div className="bg-primary/5 dark:bg-orange-300/60 h-5 rounded-3xl border font-medium border-primary/30 text-[10px] text-center px-2 py-0.5">
                      {lcpImageData.length} images
                    </div>
                  ) : (
                    <div className="w-16 h-5 rounded-3xl bg-primary/20 animate-pulse" />
                  )}

                  <span className="text-xs md:text-sm">
                    responsible for largest contentful paint
                  </span>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search images..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="w-full pl-10 border border-primary/10 focus-visible:border-primary/10 ring-0"
                    />
                  </div>

                  <Select
                    value={sortBy}
                    onValueChange={(value) =>
                      setSortBy(value as "avg_lcp" | "occurrence")
                    }
                  >
                    <SelectTrigger className="w-full sm:w-48 border border-primary/10 ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avg_lcp">Sort by Avg LCP</SelectItem>
                      <SelectItem value="occurrence">
                        Sort by Occurrences
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Main layout */}
              <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
                {/* Image list */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="space-y-3">
                    {lcpImageData.length === 0 ? (
                      <div className="text-center text-muted-foreground">
                        {isLoading
                          ? "Loading images..."
                          : "No LCP image data found"}
                      </div>
                    ) : (
                      lcpImageData.map((metric, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedImage(metric)}
                          className={`flex gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                            selectedImage?.image_url === metric.image_url
                              ? "border-primary/20 bg-primary/5 dark:bg-secondary-background"
                              : "border-primary/5 hover:bg-primary/5"
                          }`}
                        >
                          <Image
                            src={metric.image_url}
                            alt={`LCP image ${index}`}
                            className="rounded-sm border object-cover shrink-0"
                            loading="lazy"
                            width={40}
                            height={40}
                          />

                          <div className="flex-1 min-w-0">
                            <Link
                              href={metric.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium truncate hover:underline block"
                            >
                              {metric.image_url.split("/").pop() ||
                                "Unknown Image"}
                            </Link>

                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                              <span>
                                Occurred: {metric.occurrence_count} times
                              </span>

                              <div className="flex items-center gap-1 border shadow-sm border-primary/10 rounded-2xl px-2">
                                Avg LCP
                                <span
                                  className={` font-medium text-${(() => {
                                    const lcp =
                                      typeof metric?.avg_lcp_ms === "number"
                                        ? metric.avg_lcp_ms
                                        : 0;

                                    if (lcp < cwv_ranges.lcp[0])
                                      return "green-500";
                                    if (
                                      lcp >= cwv_ranges.lcp[0] &&
                                      lcp < cwv_ranges.lcp[1]
                                    )
                                      return "yellow-500";
                                    return "red-300";
                                  })()}`}
                                >
                                  {metric?.avg_lcp_ms ?? "N/A"} ms
                                </span>
                              </div>

                              <span className="border shadow-sm border-primary/10 rounded-2xl px-2 font-medium">
                                {formatFileSize(metric.avg_transfer_size)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="lg:col-span-5 space-y-6">
                  {selectedImage ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="overflow-hidden rounded-sm border">
                          <Image
                            src={selectedImage.image_url}
                            alt="Selected LCP image"
                            className="object-contain bg-primary/20 dark:bg-secondary-background"
                            width={300}
                            height={192}
                          />
                        </div>

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
                        />

                        <div className="pt-2 border-t flex justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Lazy Loaded:
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
                                  selectedImage.pct_exceeding_cwv as unknown as string,
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

                      <div className="border p-4 rounded-sm">
                        <ImageOptimizerLite
                          imageUrl={selectedImage.image_url}
                        />
                      </div>
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
        ) : (
          <>
            <PrimaryToolbar
              isSticky
              defaultDateRange={30}
              enableDistribution={false}
              enableAllDevices={false}
              disableTablet={false}
              disableCalender
            />

            <div className="flex flex-col gap-6 p-5 min-h-screen">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800/50">
                {/* Left: Title & Context */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold tracking-tight text-primary">
                      Critical Images
                    </h1>
                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-xs bg-red-200 rounded-md border border-red-400 px-2 py-0.5 font-medium dark:text-primary-foreground/80 text-primary/80 tabular-nums">
                      {lcpImageData?.length || 0} Assets
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Images responsible for your Largest Contentful Paint (LCP).
                  </p>
                </div>

                {/* Right: Minimalist Toolbar */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-none group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" />
                    <Input
                      type="text"
                      placeholder="Search images..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="h-9 w-full md:w-64 pl-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-md text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:border-zinc-400 transition-all placeholder:text-zinc-400"
                    />
                  </div>

                  <Select
                    value={sortBy}
                    onValueChange={(value) =>
                      setSortBy(value as "avg_lcp" | "occurrence")
                    }
                  >
                    <SelectTrigger className="h-9 w-37.5 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 focus:ring-1 focus:ring-zinc-400">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3 h-3 opacity-60" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-md border-zinc-200 dark:border-zinc-800 shadow-xl">
                      <SelectItem value="avg_lcp" className="text-xs">
                        Sort by LCP
                      </SelectItem>
                      <SelectItem value="occurrence" className="text-xs">
                        Sort by Frequency
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
                {/* Left: Image List */}
                <div className="lg:col-span-3 col-span-1 space-y-4">
                  <div className="space-y-3">
                    {lcpImageData.length === 0 ? (
                      <div className="text-center text-muted-foreground">
                        {isLoading
                          ? "Loading images..."
                          : "No LCP image data found"}
                      </div>
                    ) : (
                      lcpImageData.map((metric, index) => {
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-sm transition-all border cursor-pointer hover:bg-primary/5 hover:dark:bg-secondary-background ${
                              selectedImage?.image_url === metric.image_url
                                ? "border-primary/20 dark:bg-secondary-background"
                                : "border-primary/5"
                            }`}
                            onClick={() => setSelectedImage(metric)}
                          >
                            <div className="relative">
                              <Image
                                src={metric.image_url}
                                alt={`LCP image ${index}`}
                                className="object-cover rounded-sm border"
                                loading="lazy"
                                width={40}
                                height={40}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1 w-75">
                                <Link
                                  href={metric.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium hover:underline truncate"
                                >
                                  {metric.image_url.split("/").pop() ||
                                    "Unknown Image"}
                                </Link>
                              </div>

                              <div className="flex gap-2 items-center text-xs text-muted-foreground mt-1">
                                <span>
                                  Occured: {metric.occurrence_count} times
                                </span>
                                <div className="flex items-center gap-1 border shadow-sm border-primary/10 rounded-2xl px-2">
                                  Avg lcp
                                  <span
                                    className={` font-medium text-${(() => {
                                      const lcp =
                                        typeof metric?.avg_lcp_ms === "number"
                                          ? metric.avg_lcp_ms
                                          : 0;

                                      if (lcp < cwv_ranges.lcp[0])
                                        return "green-500";
                                      if (
                                        lcp >= cwv_ranges.lcp[0] &&
                                        lcp < cwv_ranges.lcp[1]
                                      )
                                        return "yellow-500";
                                      return "red-300";
                                    })()}`}
                                  >
                                    {metric?.avg_lcp_ms ?? "N/A"} ms
                                  </span>
                                </div>

                                <span className="border shadow-sm border-primary/10 rounded-2xl px-2 font-medium">
                                  {formatFileSize(metric.avg_decoded_body_size)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Details */}
                <div className="space-y-6 lg:col-span-5 ">
                  {selectedImage ? (
                    <>
                      <div className="grid grid-cols-4 gap-6">
                        <div className="col-span-1 md:col-span-2 space-y-3">
                          <div className="overflow-hidden flex items-center justify-center rounded-sm border">
                            <Image
                              src={selectedImage.image_url}
                              alt="Selected LCP image"
                              className="object-contain bg-primary/20 dark:bg-secondary-background"
                              width={0}
                              height={0}
                              sizes="100vw"
                              style={{ width: "auto", height: "192px" }}
                            />
                          </div>
                          <div className="bg-transparent">
                            <Performancetab
                              avg_transfer_size={
                                selectedImage.avg_transfer_size
                              }
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
                              isLazyloaded={
                                selectedImage.pct_lazy === 0 ? false : true
                              }
                            />
                          </div>

                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground">
                                  Lazy Loaded:
                                </div>
                                <div className="font-medium">
                                  {selectedImage.pct_lazy === 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="text-red-600"
                                    >
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
                              </div>
                              <>
                                <div className="flex text-xs items-center gap-2">
                                  <div className="text-muted-foreground">
                                    Exceeding CWV
                                  </div>
                                  <div
                                    className={`font-medium ${
                                      parseFloat(
                                        selectedImage.pct_exceeding_cwv as unknown as string,
                                      ) > 0
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {selectedImage.pct_exceeding_cwv}%
                                  </div>
                                </div>
                              </>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-1 md:col-span-2 border p-4 rounded-sm">
                          <ImageOptimizerLite
                            imageUrl={selectedImage.image_url}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {isLoading ? (
                        <div className="h-50 w-full bg-primary/5 rounded-sm animate-pulse"></div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Images className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Select an image to view details</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  async function fetchLcpImages() {
    setIsLoading(true);

    const key = `lcp-images:${selectedSite}`;

    const { response } = await cachedData({
      fn: fetchImages,
      key: key,
      session_Storage: true,
      ttl: 5 * 60 * 1000,
    });

    setRawLcpImageData(response.data);

    setIsLoading(false);

    async function fetchImages() {
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
    }
  }

  function isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url);
  }
}
