"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { Images } from "lucide-react";
import BeatLoader from "react-spinners/BeatLoader";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import DashboardToolbar from "@/components/utils/toolbar";

export interface LcpImageMetric {
  period: string;
  domain_name: string;
  device_type: string;
  image_url: string;
  occurrence_count: number;
  avg_lcp_ms: string;
  min_lcp_ms: string;
  max_lcp_ms: string;
  p75_lcp_ms: string;
  pct_exceeding_cwv: string;
}

const color = "green";

export default function LcpImageDebugger() {
  const [rawLcpImageData, setRawLcpImageData] = useState<LcpImageMetric[]>([]);
  const [selectedImage, setSelectedImage] = useState<LcpImageMetric | null>(
    null
  );
  const [sortBy, setSortBy] = useState<"avg_lcp" | "occurrence">("avg_lcp");

  const { selectedSite, rumDateRange, selectedDevice } = useSiteContext();

  useEffect(() => {
    if (selectedSite.length > 0) {
      fetchLcpImages();
    }
  }, [selectedSite, rumDateRange]);

  // Recompute sorted + filtered data only when inputs change
  const lcpImageData = useMemo(() => {
    const filtered = rawLcpImageData.filter(
      (item) => item.device_type === selectedDevice || !selectedDevice
    );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "avg_lcp") {
        return parseFloat(b.avg_lcp_ms) - parseFloat(a.avg_lcp_ms);
      } else {
        return b.occurrence_count - a.occurrence_count;
      }
    });

    return sorted;
  }, [rawLcpImageData, selectedDevice, sortBy]);

  // Auto-select the first image on data change
  useEffect(() => {
    setSelectedImage(lcpImageData[0] || null);
  }, [lcpImageData]);

  async function fetchLcpImages() {
    try {
      const res = await fetch("/api/rum/lcp-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_name: selectedSite,
          date_range: rumDateRange,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const metrics: LcpImageMetric[] = data.metrics || [];
        setRawLcpImageData(metrics);
      } else {
        setRawLcpImageData([]);
      }
    } catch (error) {
      console.error("Failed to fetch LCP image metrics:", error);
      setRawLcpImageData([]);
    }
  }

  const getBarColor = (lcp: number) => {
    if (lcp > 4000) return "#FF9898";
    if (lcp > 2500) return "#FFEEA9";
    return "#66cc8f";
  };

  if (!selectedSite || !rawLcpImageData) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      <DashboardToolbar />
      <div className="flex flex-col md:flex-row gap-6 p-5 min-h-screen">
        {/* Left: Bar List */}
        <div className="flex-1 space-y-2">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Images className="fill-orange-300/50" />
              <h2 className="text-lg text-primary/80 font-semibold">
                Top Images Responsible for LCP
              </h2>
            </div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "avg_lcp" | "occurrence")
              }
              className="border text-sm rounded px-2 py-1 bg-background dark:bg-zinc-900"
            >
              <option value="avg_lcp">Sort by Avg LCP</option>
              <option value="occurrence">Sort by Occurrences</option>
            </select>
          </div>

          {lcpImageData.map((metric, index) => {
            const lcpValue = parseFloat(metric.avg_lcp_ms);
            const barWidth = Math.min(lcpValue / 30, 100);

            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 dark:hover:bg-secondary-background hover:bg-gray-500/10 border border-gray-500/10 rounded transition cursor-pointer ${
                  selectedImage?.image_url === metric.image_url
                    ? "bg-gray-500/10 dark:bg-secondary-background"
                    : ""
                }`}
                onClick={() => setSelectedImage(metric)}
              >
                <img
                  src={metric.image_url}
                  alt={`LCP image ${index}`}
                  className="h-10 w-16 object-cover rounded-sm border"
                />
                <div className="flex-1">
                  <a
                    href={metric.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:underline truncate block"
                  >
                    {metric.image_url.split("/").pop()}
                  </a>
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 h-3 rounded overflow-hidden mt-1">
                    <div
                      className="h-3"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: getBarColor(lcpValue),
                        borderRadius: "0.25rem",
                      }}
                    />
                  </div>
                </div>
                <div className="text-xs text-right min-w-[60px]">
                  {lcpValue.toFixed(0)} ms
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Details */}
        <div className="flex-1 max-w-md space-y-4">
          {selectedImage ? (
            <>
              <div className="overflow-hidden">
                <img
                  src={selectedImage.image_url}
                  alt="Selected LCP image"
                  className="w-full p-2 h-64 object-cover border"
                />
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-muted-foreground text-xs">
                  {selectedImage.period} — {selectedImage.device_type}
                </div>
                <div>
                  <strong>Avg LCP:</strong> {selectedImage.avg_lcp_ms} ms
                </div>
                <div>
                  <strong>Min:</strong> {selectedImage.min_lcp_ms} ms |{" "}
                  <strong>Max:</strong> {selectedImage.max_lcp_ms} ms
                </div>
                <div>
                  <strong>P75:</strong> {selectedImage.p75_lcp_ms} ms
                </div>
                <div>
                  <strong>Occurrences:</strong> {selectedImage.occurrence_count}
                </div>
                <div
                  className={`font-semibold ${
                    parseFloat(selectedImage.pct_exceeding_cwv) > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {selectedImage.pct_exceeding_cwv}% exceeding CWV
                </div>
              </div>

              {parseFloat(selectedImage.pct_exceeding_cwv) > 0 && (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 p-4 rounded mt-4 text-sm">
                  <h3 className="font-semibold mb-2">Optimization Tips</h3>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>
                      Convert images to <strong>WebP</strong> or{" "}
                      <strong>AVIF</strong>
                    </li>
                    <li>
                      Use <strong>lazy loading</strong> for offscreen images
                    </li>
                    <li>
                      Resize images properly. Don’t use large images in small
                      containers.
                    </li>
                    <li>
                      Use a CDN like <strong>Cloudflare</strong> or{" "}
                      <strong>ImageKit</strong>
                    </li>
                    <li>
                      Try plugins:{" "}
                      <strong>
                        ShortPixel, Optimole, or Smush (for WordPress)
                      </strong>
                    </li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="sweet-loading flex w-full h-[300px] items-center justify-center">
              <BeatLoader
                color={color}
                loading={true}
                data-testid="loader"
                size={10}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
