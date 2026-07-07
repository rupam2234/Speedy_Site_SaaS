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
  avg_element_render_delay,
  avg_time_to_first_byte,
  isLazyloaded,
  poor_lcp,
  sample,
}: imageMetric) {
  const loadDelay = Number(avg_resource_load_delay || 0);
  const ttfb = Number(avg_time_to_first_byte || 0);
  const renderDelay = Number(avg_element_render_delay || 0);
  const transferSize = Number(avg_transfer_size || 0);
  const decodedSize = Number(avg_decoded_body_size || 0);

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
          "Exclude this image from lazy-loading — it's delaying LCP. Most caching/optimization plugins " +
          "(e.g. WP Rocket, Autoptimize, LiteSpeed Cache) let you exclude specific images or the first N images on a page.",
        type: "error",
      });
    }

    if (ttfb > 500) {
      obs.push({
        msg:
          "Server is slow to respond. Enable page caching (WP Rocket, W3 Total Cache), use a CDN for faster asset delivery and check with your host " +
          "about upgrading PHP/server resources.",
        type: "error",
      });
    }

    if (transferSize > 250 * 1024) {
      const msg =
        ttfb < 200
          ? `Compress and convert this image to WebP/AVIF (${formatFileSize(transferSize)} currently) using the recommended option below.`
          : `This image (${formatFileSize(transferSize)}) is adding to an already slow load. Compress it with the recommended option below.`;
      obs.push({ msg, type: ttfb < 200 ? "warning" : "error" });
    }

    if (renderDelay > 1500) {
      obs.push({
        msg:
          decodedSize > 1.5 * 1024 * 1024
            ? "Resize this image to its actual display dimensions — most image plugins can auto-generate scaled sizes."
            : "A render-blocking script may be delaying paint. Try deferring non-critical JS via your caching plugin's settings.",
        type: "warning",
      });
    }

    return obs.length > 0
      ? obs
      : [
          {
            msg: `Looks good — though ${poor_lcp}% of ${sample} samples still loaded slowly.`,
            type: "info",
          },
        ];
  };

  return (
    <div className="space-y-6 bg-transparent">
      {/* 1. Stats - flat list, minimal ornamentation */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
        <MetricItem
          label="Network Transfer"
          value={formatFileSize(transferSize)}
          subtext="Compressed file size"
        />
        <MetricItem
          label="Memory Usage"
          value={formatFileSize(decodedSize)}
          subtext="Unpacked in RAM"
        />
        <MetricItem
          label="Server Wait (TTFB)"
          value={`${ttfb.toFixed(0)}ms`}
          status={ttfb > 500 ? "bad" : ttfb > 200 ? "warn" : "good"}
        />
        <MetricItem
          label="Discovery Delay"
          value={`${(loadDelay / 1000).toFixed(2)}s`}
          subtext={isLazyloaded ? "Lazy loaded" : "Direct discovery"}
        />
        <MetricItem
          label="Render Delay"
          value={`${(renderDelay / 1000).toFixed(2)}s`}
          status={renderDelay > 1000 ? "warn" : "good"}
        />
        <MetricItem
          label="Loading Priority"
          value={isLazyloaded ? "Low" : "High"}
          subtext={isLazyloaded ? "loading='lazy'" : "loading='eager'"}
          status={isLazyloaded ? "warn" : "good"}
        />
      </div>

      {/* 3. Suggestions - quiet list, dot indicators instead of colored blocks */}
      <div className="space-y-3 pt-5 border-t border-border/40">
        <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Analysis &amp; Suggestions
        </h4>
        <div className="space-y-3">
          {getObservations().map((obs, i) => (
            <div
              key={i}
              className="flex gap-2.5 text-sm text-foreground/80 leading-relaxed"
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  obs.type === "error"
                    ? "bg-red-500"
                    : obs.type === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                }`}
              />
              <span>{obs.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  subtext,
  status = "neutral",
}: {
  label: string;
  value: string;
  subtext?: string;
  status?: "good" | "warn" | "bad" | "neutral";
}) {
  const dotColors = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
    neutral: "",
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
        {status !== "neutral" && (
          <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />
        )}
        {label}
      </span>
      <span className="text-lg font-mono font-medium leading-none text-foreground">
        {value}
      </span>
      {subtext && (
        <span className="text-[11px] text-muted-foreground/70 leading-tight">
          {subtext}
        </span>
      )}
    </div>
  );
}
