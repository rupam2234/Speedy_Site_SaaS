"use client";

import {
  LaptopMinimal,
  Smartphone,
  Tablet,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import React, { ReactNode, useState } from "react";

type FilterType =
  | "all"
  | "slow-host"
  | "uncompressed"
  | "high-queue"
  | "healthy";

type ByType = {
  count: number;
  totalDuration: number;
  totalTransferSize: number;
};

type SlowResource = {
  url: string;
  type: string;
  start: number;
  duration: number;
  status: number | null;
  cached: boolean;
  phases: {
    restricted?: boolean;
    dns?: number;
    ssl?: number;
    ttfb?: number;
    connect?: number;
    download?: number;
    redirect?: number;
  };
  protocol: string | null;
  decodedSize: number;
  transferSize: number;
};

type HarData = {
  type: string;
  byType: Record<string, ByType>;
  slowest: SlowResource[];
  siteDomain: string;
  totalRequests: number;
  totalTransferSize: number;
};

type LogItem = {
  id: number;
  session_id: string;
  current_page: string;
  created_at: string;
  city: string;
  country: string;
  device_type: "mobile" | "desktop" | "tablet";
  ttfb: number;
  cache_status: string;
  experience: string;
  backend_ms: number;
  transfer_size: number;
  decoded_size: number;
  lcp_rating: string;
  lcp_value: number;
  inp_rating: string;
  inp_value: number;
  har_data: HarData | null;
};

const TYPE_COLORS: Record<string, string> = {
  xmlhttprequest: "#E24B4A",
  fetch: "#378ADD",
  script: "#7F77DD",
  css: "#1D9E75",
  img: "#BA7517",
  iframe: "#D4537E",
  link: "#888780",
  beacon: "#639922",
  other: "#888780",
  video: "#0F6E56",
};

function fmt(ms: number) {
  return Math.round(ms) + "ms";
}

function fmtKB(bytes: number) {
  return Math.round(bytes / 1024) + " KB";
}

function calcCompression(item: LogItem) {
  if (!item.decoded_size || item.decoded_size === 0) return null;
  const pct =
    ((item.decoded_size - item.transfer_size) / item.decoded_size) * 100;
  return Math.round(pct);
}

function ratingColor(rating: string) {
  if (rating === "good") return "text-green-500";
  if (rating === "poor") return "text-red-500";
  return "text-amber-500";
}

function ttfbColor(ms: number) {
  if (ms > 800) return "text-red-500";
  if (ms > 200) return "text-amber-500";
  return "text-green-500";
}
function DeviceIcon({ type }: { type: "mobile" | "desktop" | "tablet" }) {
  if (type === "desktop")
    return <LaptopMinimal size={14} className="text-blue-400 shrink-0" />;
  if (type === "mobile")
    return <Smartphone size={14} className="text-amber-400 shrink-0" />;
  return <Tablet size={14} className="rotate-90 text-purple-400 shrink-0" />;
}

function RatingBadge({ rating }: { rating: string }) {
  const cls =
    rating === "good"
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : rating === "poor"
        ? "bg-red-500/10 text-red-500 border-red-500/20"
        : "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return (
    <span
      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${cls}`}
    >
      {rating}
    </span>
  );
}

function MetricCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-primary/5 rounded-md px-3 py-2.5">
      <p className="text-[10px] uppercase font-medium text-primary/50 tracking-wide">
        {label}
      </p>
      <div className={`text-sm font-medium mt-0.5 ${className}`}>{value}</div>
    </div>
  );
}

type TooltipData = {
  resource: SlowResource;
  x: number;
  y: number;
};

function HarTooltip({ data }: { data: TooltipData }) {
  const { resource: s, x, y } = data;
  const isRestricted = s.phases?.restricted;
  const phases = isRestricted ? null : s.phases;

  const rows: { label: string; value: string; color?: string }[] = [
    { label: "URL", value: s.url },
    { label: "Type", value: s.type },
    { label: "Start", value: fmt(s.start) },
    { label: "Duration", value: fmt(s.duration), color: "#E24B4A" },
    { label: "Status", value: s.status ? String(s.status) : "—" },
    { label: "Protocol", value: s.protocol || "—" },
    { label: "Cached", value: s.cached ? "Yes" : "No" },
    ...(s.transferSize
      ? [{ label: "Transfer", value: fmtKB(s.transferSize) }]
      : []),
    ...(s.decodedSize
      ? [{ label: "Decoded", value: fmtKB(s.decodedSize) }]
      : []),
  ];

  const phaseRows: { label: string; value: string; color: string }[] = phases
    ? [
        {
          label: "Redirect",
          value: fmt(phases.redirect ?? 0),
          color: "#888780",
        },
        { label: "DNS", value: fmt(phases.dns ?? 0), color: "#1D9E75" },
        { label: "Connect", value: fmt(phases.connect ?? 0), color: "#BA7517" },
        { label: "SSL", value: fmt(phases.ssl ?? 0), color: "#7F77DD" },
        { label: "TTFB", value: fmt(phases.ttfb ?? 0), color: "#378ADD" },
        {
          label: "Download",
          value: fmt(phases.download ?? 0),
          color: "#639922",
        },
      ]
    : [];

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 14, top: y - 8 }}
    >
      <div
        className="bg-primary text-primary-foreground rounded-md shadow-lg text-[10px] min-w-48 max-w-64"
        style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
      >
        {/* URL header */}
        <div className="px-3 py-2 border-b border-white/10 font-medium break-all leading-tight">
          {s.url}
        </div>

        {/* Core fields */}
        <div className="px-3 py-2 space-y-1">
          {rows.slice(1).map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
              <span className="opacity-50">{r.label}</span>
              <span
                className="font-medium"
                style={r.color ? { color: r.color } : {}}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        {/* Phase breakdown */}
        {isRestricted ? (
          <div className="px-3 py-2 border-t border-white/10 text-amber-400 opacity-70">
            ⚠ Phase data restricted (cross-origin)
          </div>
        ) : (
          <div className="px-3 py-2 border-t border-white/10 space-y-1">
            <p className="opacity-50 uppercase tracking-wide text-[9px] mb-1.5">
              Phases
            </p>
            {phaseRows.map((r) => (
              <div
                key={r.label}
                className="flex justify-between gap-4 items-center"
              >
                <span className="opacity-50 flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-sm"
                    style={{ background: r.color }}
                  />
                  {r.label}
                </span>
                <span className="font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WaterfallBar({
  resource,
  maxEnd,
  onHover,
  onLeave,
}: {
  resource: SlowResource;
  maxEnd: number;
  onHover: (data: TooltipData) => void;
  onLeave: () => void;
}) {
  const s = resource;
  const isRestricted = s.phases?.restricted;
  const color = TYPE_COLORS[s.type] || "#888";

  // Phase widths as % of total timeline
  const pct = (ms: number) => ((ms / maxEnd) * 100).toFixed(2) + "%";
  const leftPct = pct(s.start);

  const phases = !isRestricted ? s.phases : null;
  const phaseSegments = phases
    ? [
        { key: "redirect", ms: phases.redirect ?? 0, color: "#888780" },
        { key: "dns", ms: phases.dns ?? 0, color: "#1D9E75" },
        { key: "connect", ms: phases.connect ?? 0, color: "#BA7517" },
        { key: "ssl", ms: phases.ssl ?? 0, color: "#7F77DD" },
        { key: "ttfb", ms: phases.ttfb ?? 0, color: "#378ADD" },
        { key: "download", ms: phases.download ?? 0, color: "#639922" },
      ].filter((p) => p.ms > 0)
    : [];

  const totalPhaseMs = phaseSegments.reduce((a, p) => a + p.ms, 0);
  const hasPhases = phaseSegments.length > 0 && totalPhaseMs > 0;

  return (
    <div
      className="grid gap-2 items-center group"
      style={{ gridTemplateColumns: "180px 1fr 52px 36px" }}
      onMouseMove={(e) => onHover({ resource: s, x: e.clientX, y: e.clientY })}
      onMouseLeave={onLeave}
    >
      {/* URL label */}
      <span
        className="text-[10px] text-primary/60 truncate group-hover:text-primary/90 transition-colors"
        title={s.url}
      >
        {s.url}
      </span>

      {/* Timeline track */}
      <div className="relative h-4 bg-primary/5 rounded-sm overflow-visible">
        {hasPhases ? (
          // Phased bar — segments stacked left to right within the bar
          <div
            className="absolute top-0 h-full flex rounded-sm overflow-hidden"
            style={{ left: leftPct, width: pct(s.duration) }}
          >
            {phaseSegments.map((p) => (
              <div
                key={p.key}
                className="h-full shrink-0"
                style={{
                  width: ((p.ms / totalPhaseMs) * 100).toFixed(2) + "%",
                  background: p.color,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        ) : (
          // Solid bar for restricted / no phase data
          <div
            className="absolute top-0 h-full rounded-sm opacity-75"
            style={{
              left: leftPct,
              width: pct(Math.max(s.duration, maxEnd * 0.005)),
              background: color,
              backgroundImage: isRestricted
                ? "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)"
                : "none",
            }}
          />
        )}
      </div>

      {/* Duration */}
      <span className="text-[10px] text-primary/50 text-right tabular-nums">
        {fmt(s.duration)}
      </span>

      {/* Status */}
      <span className="text-[10px] text-right">
        {s.status ? (
          <span
            className={s.status >= 400 ? "text-red-500" : "text-primary/40"}
          >
            {s.status}
          </span>
        ) : (
          <span className="text-amber-500/70">⚠</span>
        )}
      </span>
    </div>
  );
}

function HarPanel({ item }: { item: LogItem }) {
  const har = item.har_data;
  const compression = calcCompression(item);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (!har) {
    return (
      <div className="px-3 py-4 text-xs text-primary/40 italic">
        No HAR data available for this session.
      </div>
    );
  }

  const maxEnd = Math.max(...har.slowest.map((s) => s.start + s.duration), 1);

  const sortedTypes = Object.entries(har.byType).sort(
    (a, b) => b[1].totalDuration - a[1].totalDuration,
  );

  return (
    <div className="border-t border-primary/5 px-3 py-4 space-y-5">
      {tooltip && <HarTooltip data={tooltip} />}

      {/* Server performance metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard
          label="TTFB"
          value={fmt(item.ttfb)}
          className={ttfbColor(item.ttfb)}
        />
        <MetricCard label="Backend" value={fmt(item.backend_ms)} />
        <MetricCard
          label="LCP"
          value={
            <span className="flex items-center gap-1.5">
              {fmt(item.lcp_value)}
              <RatingBadge rating={item.lcp_rating} />
            </span>
          }
        />
        <MetricCard
          label="INP"
          value={
            <span className="flex items-center gap-1.5">
              {fmt(item.inp_value)}
              <RatingBadge rating={item.inp_rating} />
            </span>
          }
        />
        <MetricCard label="Transfer" value={fmtKB(item.transfer_size)} />
        <MetricCard
          label="Compression"
          value={compression !== null ? `${compression}%` : "n/a"}
          className={
            compression !== null
              ? compression > 50
                ? "text-green-500"
                : "text-red-500"
              : ""
          }
        />
        <MetricCard label="Cache" value={item.cache_status} />
        <MetricCard label="Requests" value={har.totalRequests} />
      </div>

      {/* Resource by type */}
      <div>
        <p className="text-[10px] uppercase font-medium text-primary/50 tracking-wide mb-2">
          Resource breakdown
        </p>
        <div className="flex flex-wrap gap-2">
          {sortedTypes.map(([type, v]) => (
            <div
              key={type}
              className="flex items-center gap-1.5 bg-primary/5 rounded px-2 py-1.5"
            >
              <span
                className="inline-block w-2 h-2 rounded-sm shrink-0"
                style={{ background: TYPE_COLORS[type] || "#888" }}
              />
              <span className="text-[10px] font-medium text-primary/70">
                {type}
              </span>
              <span className="text-[10px] text-primary/40">{v.count}×</span>
              <span className="text-[10px] text-primary/40">
                {Math.round(v.totalDuration)}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Waterfall */}
      <div>
        <p className="text-[10px] uppercase font-medium text-primary/50 tracking-wide mb-1">
          Slowest resources
        </p>

        {/* Column headers */}
        <div
          className="grid gap-2 mb-2 pb-1.5 border-b border-primary/5"
          style={{ gridTemplateColumns: "180px 1fr 52px 36px" }}
        >
          <span className="text-[9px] uppercase text-primary/30 tracking-wide">
            Resource
          </span>
          <span className="text-[9px] uppercase text-primary/30 tracking-wide">
            Timeline
          </span>
          <span className="text-[9px] uppercase text-primary/30 tracking-wide text-right">
            Duration
          </span>
          <span className="text-[9px] uppercase text-primary/30 tracking-wide text-right">
            Status
          </span>
        </div>

        <div className="space-y-1">
          {har.slowest.map((s, i) => (
            <WaterfallBar
              key={i}
              resource={s}
              maxEnd={maxEnd}
              onHover={setTooltip}
              onLeave={() => setTooltip(null)}
            />
          ))}
        </div>

        {/* Phase legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-primary/5">
          {[
            { label: "redirect", color: "#888780" },
            { label: "dns", color: "#1D9E75" },
            { label: "connect", color: "#BA7517" },
            { label: "ssl", color: "#7F77DD" },
            { label: "ttfb", color: "#378ADD" },
            { label: "download", color: "#639922" },
          ].map((p) => (
            <span
              key={p.label}
              className="flex items-center gap-1 text-[10px] text-primary/40"
            >
              <span
                className="inline-block w-2 h-2 rounded-sm"
                style={{ background: p.color }}
              />
              {p.label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-primary/40">
            <span
              className="inline-block w-4 h-2 rounded-sm"
              style={{
                background: "#888",
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)",
              }}
            />
            restricted
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Logs({ logData }: { logData: LogItem[] }) {
  const [filters, setFilters] = useState<Set<FilterType>>(new Set(["all"]));
  const [displayFilters, setDisplayFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filterArray: FilterType[] = [
    "all",
    "healthy",
    "high-queue",
    "slow-host",
    "uncompressed",
  ];

  const toggleFilter = (f: FilterType) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) {
        next.delete(f);
      } else {
        if (f === "all") next.clear();
        else next.delete("all");
        next.add(f);
      }
      if (next.size === 0) next.add("all");
      return next;
    });
  };

  const filteredLogs = (logData || []).filter((item) => {
    if (filters.has("all") || filters.size === 0) return true;
    const compression = calcCompression(item);
    const isUncompressed = compression !== null && compression < 50;
    const isSlowBackend = item.backend_ms > 800;
    const isHighQueue = false; // requestQueueTime not in flat schema — extend if needed

    const checks: boolean[] = [];
    if (filters.has("slow-host")) checks.push(isSlowBackend);
    if (filters.has("uncompressed")) checks.push(isUncompressed);
    if (filters.has("high-queue")) checks.push(isHighQueue);
    if (filters.has("healthy"))
      checks.push(!isSlowBackend && !isUncompressed && !isHighQueue);
    return checks.some(Boolean);
  });

  const headers = ["Page", "TTFB / Cache", "Vitals", "Status"];

  return (
    <div className="my-10">
      <h3 className="uppercase text-xs font-medium text-primary/80 mb-5">
        Recent traffic logs &amp; issues
      </h3>

      {/* Filter bar */}
      <div className="flex my-4 font-medium text-primary/80 flex-wrap gap-1.5 text-xs">
        <div
          className="border h-10 flex items-center gap-1 relative border-primary/10 rounded-sm bg-transparent px-2 py-0.5 cursor-pointer select-none"
          onClick={() => setDisplayFilters((p) => !p)}
        >
          <p className="text-sm">Filters</p>
          {[...filters].map((x) => (
            <div
              key={x}
              className="px-2 group flex items-center gap-1 py-1 bg-primary/80 mx-1 my-2 text-primary-foreground rounded-[1px]"
            >
              <span className="capitalize">{x}</span>
              <span
                className="text-transparent group-hover:text-primary-foreground/50 ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFilter(x);
                }}
              >
                ×
              </span>
            </div>
          ))}
          {displayFilters && (
            <div className="absolute min-w-32 top-10 left-0 capitalize bg-primary/90 text-primary-foreground z-50 rounded-sm shadow-md">
              {filterArray
                .filter((f) => !filters.has(f))
                .map((x) => (
                  <p
                    key={x}
                    className="px-3 hover:bg-primary/60 py-2 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter(x);
                      setDisplayFilters(false);
                    }}
                  >
                    {x}
                  </p>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-3 text-[11px] text-primary/70 font-semibold uppercase py-1.5 bg-primary/10 rounded-sm">
          {headers.map((h) => (
            <span className="col-span-3" key={h}>
              {h}
            </span>
          ))}
        </div>

        {filteredLogs.map((item) => {
          const compression = calcCompression(item);
          const isUncompressed = compression !== null && compression < 50;
          const isSlowBackend = item.backend_ms > 800;
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="border border-primary/5 dark:bg-secondary-background rounded-sm overflow-hidden"
            >
              {/* Main row — click to toggle HAR panel */}
              <div
                className="grid grid-cols-12 gap-4 px-3 py-3 hover:bg-primary/5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                {/* Page + location */}
                <div className="col-span-3 text-xs text-primary/70">
                  <div className="flex font-medium items-center gap-1.5">
                    <DeviceIcon type={item.device_type} />
                    <span className="truncate">
                      {item.current_page || "unknown"}
                    </span>
                  </div>
                  <div className="text-primary/40 mt-1 text-[10px]">
                    {item.city}, {item.country}
                  </div>
                </div>

                {/* TTFB + cache */}
                <div className="col-span-3 text-[11px] text-primary/70">
                  <span className={`font-bold ${ttfbColor(item.ttfb)}`}>
                    {fmt(item.ttfb)}
                  </span>
                  <div className="mt-1 text-primary/40 text-[10px]">
                    Cache: {item.cache_status}
                  </div>
                </div>

                {/* LCP + INP */}
                <div className="col-span-3 text-[11px] text-primary/70 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary/40">LCP</span>
                    <span
                      className={`font-medium ${ratingColor(item.lcp_rating)}`}
                    >
                      {fmt(item.lcp_value)}
                    </span>
                    <RatingBadge rating={item.lcp_rating} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary/40">INP</span>
                    <span
                      className={`font-medium ${ratingColor(item.inp_rating)}`}
                    >
                      {fmt(item.inp_value)}
                    </span>
                    <RatingBadge rating={item.inp_rating} />
                  </div>
                </div>

                {/* Status badges + expand toggle */}
                <div className="col-span-3 flex flex-wrap gap-1 items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {isSlowBackend && (
                      <span className="bg-red-500/10 text-red-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-red-500/20">
                        Slow host
                      </span>
                    )}
                    {isUncompressed && (
                      <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-amber-500/20">
                        Uncompressed
                      </span>
                    )}
                    {!isSlowBackend && !isUncompressed && (
                      <span className="text-green-500 text-[10px] font-medium">
                        Healthy
                      </span>
                    )}
                  </div>
                  <span className="text-primary/30 ml-auto">
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>
                </div>
              </div>

              {/* HAR panel — shown when expanded */}
              {isExpanded && <HarPanel item={item} />}
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="text-center text-xs text-primary/40 py-10">
            No sessions match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
