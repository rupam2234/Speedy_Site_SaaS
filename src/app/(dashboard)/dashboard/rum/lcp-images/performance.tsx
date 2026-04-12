"use client";

import { ReactNode } from "react";

interface imageMetric {
  avg_transfer_size: number | null;
  avg_decoded_body_size: number | null;
  avg_resource_load_delay: number | null;
  avg_resource_load_duration: number | null;
  avg_element_render_delay: number | null;
  avg_time_to_first_byte: number | null;
  isLazyloaded: boolean;
  sample: number | null;
  poor_lcp: number | null;
}

export default function Performancetab({
  avg_transfer_size,
  avg_decoded_body_size,
  avg_resource_load_delay,
  avg_resource_load_duration,
  avg_element_render_delay,
  avg_time_to_first_byte,
  isLazyloaded,
  poor_lcp,
  sample,
}: imageMetric) {
  const loadDelay = Number(avg_resource_load_delay || 0);
  const ttfb = Number(avg_time_to_first_byte || 0);
  const duration = Number(avg_resource_load_duration || 0);
  const renderDelay = Number(avg_element_render_delay || 0);
  const transferSize = Number(avg_transfer_size || 0);
  const decodedSize = Number(avg_decoded_body_size || 0);

  const downloadTime = Math.max(0, duration - ttfb);
  const totalTime = loadDelay + ttfb + downloadTime + renderDelay;

  const getW = (ms: number) => (totalTime > 0 ? (ms / totalTime) * 100 : 0);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "--";
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getObservations = () => {
    const obs: {
      msg: string | ReactNode;
      type: "error" | "warning" | "info";
    }[] = [];

    if (isLazyloaded && loadDelay > 400) {
      obs.push({
        msg:
          "This image is lazy-loaded, which can delay when it appears on screen." +
          " If this is an important image (such as a hero or above-the-fold content), consider loading it eagerly (loading=" +
          "eager" +
          ") or set fetchpriority=" +
          "'high'" +
          " to improve LCP. ",
        type: "error",
      });
    }

    if (ttfb > 500) {
      obs.push({
        msg:
          `Your server is responding slowly, which delays the image load more than the image size itself.` +
          "Focus on improving server response time — for example, optimize backend processing, enable caching, or use a faster hosting/CDN.",
        type: "error",
      });
    }

    if (transferSize > 250 * 1024) {
      const msg =
        ttfb < 200
          ? `File Size: ${formatFileSize(transferSize)} is heavy. Use WebP/AVIF to speed up the blue 'Download' phase.`
          : `File Size: Large image (${formatFileSize(transferSize)}) is making a slow server connection even worse.`;
      obs.push({ msg, type: ttfb < 200 ? "warning" : "error" });
    }

    if (renderDelay > 1500) {
      obs.push({
        msg:
          decodedSize > 1.5 * 1024 * 1024
            ? "Render: Huge decoded size. Browser is struggling to paint. Resize the actual image dimensions."
            : "Render: Something (likely JS) is blocking the browser from painting the image after download.",
        type: "warning",
      });
    }

    return obs.length > 0
      ? obs
      : [
          {
            msg: `Image performance seems optimal, however, ${poor_lcp}% of total ${sample} samples still experienced slow loading.`,
            type: "info",
          },
        ];
  };

  return (
    <div className="space-y-6 bg-transparent">
      {/* 1. Visual Waterfall */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Image Loading Timeline
          </span>
        </div>

        <div className="h-4 w-full flex overflow-hidden bg-gray-200/30 dark:bg-gray-800/50 rounded-full">
          <div
            style={{ width: `${getW(loadDelay)}%` }}
            className="h-full bg-slate-400 opacity-60"
          />
          <div
            style={{ width: `${getW(ttfb)}%` }}
            className="h-full bg-amber-500"
          />
          <div
            style={{ width: `${getW(downloadTime)}%` }}
            className="h-full bg-blue-500"
          />
          <div
            style={{ width: `${getW(renderDelay)}%` }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>

      {/* 2. Stats Grid - NOW CLEARLY LABELED */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <MetricItem
          label="Network Transfer"
          value={formatFileSize(transferSize)}
          subtext="Compressed file size"
          markerColor="bg-blue-500"
        />
        <MetricItem
          label="Memory Usage"
          value={formatFileSize(decodedSize)}
          subtext="Unpacked in RAM"
          markerColor="bg-emerald-500"
        />
        <MetricItem
          label="Server Wait (TTFB)"
          value={`${ttfb.toFixed(0)}ms`}
          status={ttfb > 500 ? "bad" : ttfb > 200 ? "warn" : "good"}
          markerColor="bg-amber-500"
        />
        <MetricItem
          label="Discovery Delay"
          value={`${(loadDelay / 1000).toFixed(2)}s`}
          subtext={isLazyloaded ? "Lazy Loaded" : "Direct Discovery"}
          markerColor="bg-slate-400"
        />
        <MetricItem
          label="Render Delay"
          value={`${(renderDelay / 1000).toFixed(2)}s`}
          status={renderDelay > 1000 ? "warn" : "good"}
          markerColor="bg-emerald-500"
        />
        <MetricItem
          label="Loading Priority"
          value={isLazyloaded ? "Low" : "High"}
          subtext={isLazyloaded ? "loading='lazy'" : "loading='eager'"}
          status={isLazyloaded ? "warn" : "good"}
        />
      </div>

      {/* 3. Suggestions */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <h4 className="text-[10px] uppercase font-bold text-muted-foreground">
          Analysis & Suggestions
        </h4>
        {getObservations().map((obs, i) => (
          <div
            key={i}
            className={`p-3 text-sm rounded-lg border-l-4 ${
              obs.type === "error"
                ? "bg-red-500/5 border-red-500 text-red-700 dark:text-red-400"
                : obs.type === "warning"
                  ? "bg-amber-500/5 border-amber-500 text-amber-700 dark:text-amber-400"
                  : "bg-blue-500/5 border-blue-500 text-blue-700 dark:text-blue-400"
            }`}
          >
            {obs.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  subtext,
  status = "neutral",
  markerColor,
}: {
  label: string;
  value: string;
  subtext?: string;
  status?: "good" | "warn" | "bad" | "neutral";
  markerColor?: string;
}) {
  const textColors = {
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
    neutral: "text-foreground",
  };

  return (
    <div className="relative pl-4 flex flex-col gap-0.5">
      {/* Visual Marker to link with Waterfall */}
      {markerColor && (
        <div
          className={`absolute left-0 top-1 w-1 h-8 rounded-full ${markerColor}`}
        />
      )}

      <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-tight">
        {label}
      </span>
      <span
        className={`text-lg font-mono font-bold leading-none ${textColors[status]}`}
      >
        {value}
      </span>
      {subtext && (
        <span className="text-[10px] text-muted-foreground/60 italic leading-tight">
          {subtext}
        </span>
      )}
    </div>
  );
}
