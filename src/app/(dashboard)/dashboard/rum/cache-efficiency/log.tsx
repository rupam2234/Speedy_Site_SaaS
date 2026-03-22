"use client";

import React, { useState, useMemo } from "react";
import {
  Info,
  Monitor,
  Smartphone,
  Server,
  Network,
  CloudLightning,
  TabletIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TooltipIcon from "@/components/theme/customTooltip";
import { CustomTooltip } from "@/components/theme";

export interface RequestLog {
  id: string | number;
  created_at: string;
  current_page: string;
  is_origin_hit: string;
  cdn_provider: string | null;
  network_type: string | null;
  network_rtt: string | number | null;
  ttfb_total: number | null;
  dns_time: number | null;
  tcp_time: number | null;
  server_processing_time: number | null;
  country: string;
  city: string;
  device: string;
}

interface Props {
  data: RequestLog[];
  isLoading?: boolean;
}

export default function CacheAnalysisForensics({ data, isLoading }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { paginatedData, totalPages, startIndex, endIndex, averageTTFB } =
    useMemo(() => {
      const total = Math.ceil(data.length / itemsPerPage);
      const start = (currentPage - 1) * itemsPerPage;
      const end = Math.min(start + itemsPerPage, data.length);
      const avgTTFB =
        data.reduce((acc, index) => acc + (index.ttfb_total ?? 0), 0) /
        data.length;

      return {
        paginatedData: data.slice(start, start + itemsPerPage),
        totalPages: total,
        startIndex: start,
        endIndex: end,
        averageTTFB: avgTTFB,
      };
    }, [data, currentPage]);

  if (isLoading)
    return (
      <div className="p-10 text-center animate-pulse text-muted-foreground uppercase text-xs font-bold tracking-widest">
        Analyzing Edge Traffic...
      </div>
    );

  if (!data || data.length === 0) return null;

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      <div className="rounded-sm border border-primary/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-primary/10 dark:bg-primary/20 border-b border-primary/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-4">Visitor</th>
                <th className="px-4 py-4">Experience</th>
                <th className="px-4 py-4">Analysis</th>
                <th className={`px-4 py-4 text-right `}>
                  <CustomTooltip
                    content={"Includes all devices"}
                    trigger={
                      <span className="underline decoration-dotted decoration-primary/80">
                        {" "}
                        Avg. TTFB:
                      </span>
                    }
                  />{" "}
                  <span
                    className={`${averageTTFB < 800 ? "text-green-500" : averageTTFB < 1800 ? "text-orange-500" : "text-red-500"}`}
                  >
                    {averageTTFB.toFixed(2)}
                  </span>
                  MS / Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {paginatedData.map((log) => (
                <RequestRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.length > itemsPerPage && (
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Showing{" "}
            <span className="text-foreground">
              {startIndex + 1}-{endIndex}
            </span>{" "}
            of {data.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-primary/10 hover:bg-primary/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="text-[10px] font-bold uppercase tracking-tighter px-2">
              Page {currentPage} <span className="opacity-40">/</span>{" "}
              {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-primary/10 hover:bg-primary/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestRow({ log }: { log: RequestLog }) {
  const isBounced = log.ttfb_total === null;
  const ttfb = log.ttfb_total || 0;

  const isGood = ttfb > 300 && ttfb <= 600;
  const isFair = ttfb > 600 && ttfb <= 1200;
  const isPoor = ttfb > 1200;

  const isServerSlow =
    log.is_origin_hit === "true" && (log.server_processing_time || 0) > 500;
  const isEdgeColdStart = log.is_origin_hit === "false" && ttfb > 500;
  const isNetworkIssue = (log.dns_time || 0) > 150 || (log.tcp_time || 0) > 150;

  let exp = {
    title: "Excellent",
    color: "text-emerald-500",
    desc: "Edge Optimized",
  };
  if (isBounced)
    exp = { title: "User Quit", color: "text-red-500", desc: "Aborted" };
  else if (isPoor)
    exp = { title: "Poor", color: "text-red-600", desc: "Critical delay" };
  else if (isFair)
    exp = { title: "Fair", color: "text-amber-500", desc: "Noticeable lag" };
  else if (isGood)
    exp = { title: "Good", color: "text-lime-500", desc: "Acceptable" };

  let analysisLabel = "Optimized Delivery";
  if (isBounced) analysisLabel = "Connection Aborted";
  else if (isServerSlow) analysisLabel = "Origin Server Latency";
  else if (isEdgeColdStart) analysisLabel = "CDN Edge Cold Start";
  else if (isNetworkIssue) analysisLabel = "Network Handshake Delay";

  return (
    <tr className="hover:bg-primary/5 transition-colors group">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{getFlag(log.country)}</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground truncate max-w-25">
              {log.city}
            </span>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold uppercase">
              {log.device === "desktop" ? (
                <Monitor size={10} />
              ) : log.device === "mobile" ? (
                <Smartphone size={10} />
              ) : (
                <TabletIcon size={10} className="rotate-90" />
              )}
              {log.network_type || "wifi"}
            </span>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span
            className={`text-[11px] font-black uppercase tracking-tight ${exp.color}`}
          >
            {exp.title}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
            {exp.desc}
          </span>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col max-w-45">
            <span className="text-[9px] font-medium text-muted-foreground truncate italic opacity-60">
              {log.current_page}
            </span>
            <span className="text-[10px] font-bold text-foreground">
              {analysisLabel}
            </span>
          </div>

          <TooltipIcon
            side="right"
            trigger={
              <Info
                size={14}
                className="text-primary/40 hover:text-primary cursor-pointer transition-colors"
              />
            }
            content={
              <div className="p-1 space-y-3 min-w-60">
                <div className="border-b border-primary/10 pb-2">
                  <h4 className="text-xs font-bold text-primary-foreground dark:text-primary uppercase">
                    Breakdown
                  </h4>
                  <p className="text-[9px] text-primary-foreground/80 dark:text-primary/80">
                    ID: {log.id} • {log.cdn_provider || "Direct"}
                  </p>
                </div>

                <div className="space-y-2">
                  <AnalysisLine
                    icon={<Network size={12} />}
                    label="User Connection"
                    status={isNetworkIssue ? "Poor" : "Good"}
                    detail={
                      isNetworkIssue
                        ? `High ${log.dns_time && log.dns_time > 150 ? "DNS" : "TCP"} latency detected.`
                        : "Healthy connection."
                    }
                  />
                  <AnalysisLine
                    icon={<Server size={12} />}
                    label="Server Origin"
                    status={isServerSlow ? "Heavy" : "Healthy"}
                    detail={
                      isServerSlow
                        ? "The host server was slow generating the HTML."
                        : "Origin responded instantly."
                    }
                  />
                  <AnalysisLine
                    icon={<CloudLightning size={12} />}
                    label="Edge Cache"
                    status={
                      isEdgeColdStart
                        ? "Cold Start"
                        : log.is_origin_hit === "false"
                          ? "Warm Hit"
                          : "Miss"
                    }
                    detail={
                      isEdgeColdStart
                        ? "Cache Hit but slow; likely fetched from a Parent Cache node."
                        : log.is_origin_hit === "true"
                          ? "Requested file was not in CDN."
                          : "Served instantly from Edge."
                    }
                  />
                  {Number(log.network_rtt) > 0 && (
                    <div className="pt-1 border-t border-primary/5 text-[9px] text-primary-foreground/80 dark:text-primary/80 italic">
                      Round-trip time: {log.network_rtt}ms
                    </div>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        <div className="inline-flex flex-col items-end">
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded border ${log.is_origin_hit === "true" ? "text-orange-500 border-orange-500/20 bg-orange-500/5" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"}`}
          >
            {log.is_origin_hit === "true" ? "ORIGIN" : "CACHE"}
          </span>
          <span className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter">
            {log.ttfb_total ? `${Math.round(log.ttfb_total)}ms` : "DROPPED"}
          </span>
        </div>
      </td>
    </tr>
  );
}

function AnalysisLine({ icon, label, status, detail }: any) {
  const isBad =
    status === "Poor" || status === "Heavy" || status === "Cold Start";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary-foreground dark:text-primary">
          {icon} {label}
        </div>
        <span
          className={`text-[9px] font-black uppercase ${isBad ? "text-orange-500" : "text-emerald-500"}`}
        >
          {status}
        </span>
      </div>
      <p className="text-[9px] text-primary-foreground/80 dark:text-primary/80 leading-tight">
        {detail}
      </p>
    </div>
  );
}

function getFlag(countryCode: string) {
  if (!countryCode) return "🌐";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}
