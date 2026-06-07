"use client";

import { NetworkServerSchema } from "@/app/api";
import { LaptopMinimal, Smartphone, Tablet } from "lucide-react";
import React, { ReactNode, useState } from "react";

export default function Logs({ logData }: { logData: NetworkServerSchema }) {
  const [filters, setFilters] = useState<Set<FilterType>>(new Set(["all"]));

  const filterArray: FilterType[] = [
    "all",
    "healthy",
    "high-queue",
    "slow-host",
    "uncompressed",
  ];

  const headers = ["Page", "Experience", "Page Compression", "Status"];

  const [displayFilters, setDisplayFilters] = useState<boolean>(false);

  const filteredLogs = (logData || []).filter((item: any) => {
    if (filters.has("all")) return true;

    const pageCompression = calculatePageCompression(item?.navigation_timing);
    const isUncompressed = pageCompression && !pageCompression.isOptimized;
    const isSlowBackend =
      (item?.navigation_timing?.backendResponseTime || 0) > 800;
    const isHighQueue = (item?.navigation_timing?.requestQueueTime || 0) > 200;

    if (filters.has("slow-host")) return isSlowBackend;
    if (filters.has("uncompressed")) return isUncompressed;
    if (filters.has("high-queue")) return isHighQueue;
    if (filters.has("healthy"))
      return !isSlowBackend && !isUncompressed && !isHighQueue;

    return true;
  });

  return (
    <div className="my-10">
      <h3 className="uppercase text-xs font-medium text-primary/80">
        Recent Traffic Logs & Issues
      </h3>
      <div className="flex my-5 font-medium text-primary/80 flex-wrap gap-1.5 text-xs">
        <div
          className="border h-10 flex items-center gap-1 relative border-primary/10 rounded-sm bg-transparent px-2 py-0.5 cursor-pointer"
          onClick={() => {
            setDisplayFilters((prev) => !prev);
          }}
        >
          <p className="text-sm">Filters </p>
          {[...filters].map((x) => (
            <div
              className="px-2 group flex items-center gap-1 py-1 bg-primary/80 mx-1 my-2 text-primary-foreground rounded-[1px]"
              key={x}
            >
              <span className="capitalize">{x}</span>
              <span
                className="text-transparent group-hover:text-primary-foreground/50"
                onClick={() => {
                  setFilters((prev) => {
                    prev.delete(x);
                    return prev;
                  });
                }}
              >
                X
              </span>
            </div>
          ))}
          {displayFilters && (
            <div className="absolute min-w-25 top-5 capitalize left-12/12 bg-primary/80 text-primary-foreground z-50">
              {filterArray
                .filter((item) => !filters.has(item))
                .map((x) => {
                  return (
                    <p
                      key={x}
                      className="px-2 hover:bg-primary/60 py-1"
                      onClick={() => {
                        setFilters((prev) => {
                          prev.add(x);
                          return prev;
                        });
                      }}
                    >
                      {x}
                    </p>
                  );
                })}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {/* header */}
        <div className="grid grid-cols-12 gap-4 px-3 text-[11px] text-primary/70 font-semibold uppercase py-1.5 bg-primary/10 rounded-sm">
          {headers &&
            headers.map((x) => (
              <span className="col-span-3" key={x}>
                {x}
              </span>
            ))}
        </div>
        {filteredLogs &&
          filteredLogs.map((item: any) => {
            const { score } = connectionScore(item?.navigation_timing);
            const pageCompression = calculatePageCompression(
              item?.navigation_timing,
            );

            const isUncompressed =
              pageCompression && !pageCompression.isOptimized;
            const isSlowBackend =
              (item?.navigation_timing?.backendResponseTime || 0) > 800;
            const isHighQueue =
              (item?.navigation_timing?.requestQueueTime || 0) > 200;

            return (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 px-3 py-3 border border-primary/5 
                  dark:bg-secondary-background hover:bg-primary/5 rounded-sm"
              >
                {/* Connection & Location Info */}
                <div className="col-span-3 text-xs text-primary/70">
                  <div className="flex font-medium items-center gap-0.5">
                    <span className="min-w-3">
                      {deviceIcon(item?.device_info?.deviceType).icon}
                    </span>
                    <span className="ml-1 truncate">
                      {item?.current_page || "unknown"}
                    </span>
                  </div>
                  <div className="text-gray-400 mt-1">
                    {item?.location_info?.city}, {item?.location_info?.country}
                  </div>
                </div>

                {/* Score & TTFB */}
                <div className="col-span-3 text-[11px] text-primary/70">
                  <span
                    className="uppercase font-bold"
                    style={{ color: score.color }}
                  >
                    {score.connection}
                  </span>
                  <div className="mt-1">
                    TTFB:{" "}
                    {Number(
                      item?.navigation_timing?.timeToFirstByte,
                    )?.toFixed()}
                    ms
                  </div>
                </div>

                {/* Page & Compression */}
                <div className="col-span-3 text-[11px] text-primary/70">
                  <span className="relative"></span>
                  <p className="text-gray-400">
                    Zip: {pageCompression?.percentage || "0%"}{" "}
                    <span>
                      (
                      {pageCompression?.isOptimized
                        ? "Optmized"
                        : "Not Optimized"}
                      )
                    </span>
                  </p>
                </div>

                <div className="col-span-3 flex flex-wrap gap-1 items-center">
                  {isSlowBackend && (
                    <span
                      className="bg-red-500/10 text-red-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-red-500/20"
                      title="Click to see how to fix slow server response times"
                    >
                      Slow Host
                    </span>
                  )}
                  {isUncompressed && (
                    <span
                      className="bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-amber-500/20"
                      title="Click to learn how to turn on Gzip or Brotli compression"
                    >
                      Uncompressed
                    </span>
                  )}
                  {isHighQueue && (
                    <span
                      className="bg-blue-500/10 text-blue-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-blue-500/20"
                      title="Browser spent too much time waiting to send the request"
                    >
                      High Queue
                    </span>
                  )}
                  {!isSlowBackend && !isUncompressed && !isHighQueue && (
                    <span className="text-green-500 text-[10px] font-medium">
                      Healthy
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

type deviceIcons = {
  icon: ReactNode;
};

const deviceIcon = (
  deviceType: "mobile" | "desktop" | "tablet",
): deviceIcons => {
  const device: deviceIcons =
    deviceType === "desktop"
      ? { icon: <LaptopMinimal size={16} className="fill-blue-400" /> }
      : deviceType === "mobile"
        ? { icon: <Smartphone size={16} className="fill-amber-400" /> }
        : {
            icon: <Tablet size={16} className="rotate-90 fill-purple-400" />,
          };

  return device;
};

function connectionScore(metric: any) {
  let score = 100;
  let maxAllowedScore = 100;

  if (metric?.timeToFirstByte > 1800) {
    score -= 40;
    maxAllowedScore = 49;
  } else if (metric?.timeToFirstByte > 800) {
    score -= 20;
    maxAllowedScore = 89;
  }
  if (metric?.dnsLookup > 200) score -= 10;
  if (metric?.tcpConnectionTime > 200) score -= 10;
  if (metric?.tlsHandshakeTime > 200) score -= 10;

  const finalScore = Math.min(maxAllowedScore, Math.max(0, score));

  const uct = metric?.userConnectionTime;
  const uct_rating =
    uct < UserConnections.excellent
      ? "excellent"
      : uct < UserConnections.good
        ? "good"
        : uct < UserConnections.average
          ? "average"
          : "poor";

  return {
    score: getPerformanceBand(finalScore),
    userExperienceRating: uct_rating,
  };
}

enum UserConnections {
  excellent = 150,
  good = 300,
  average = 600,
  //   poor = 600+
}

enum ConnectionScoreBand {
  excellent = "excellent",
  good = "good",
  average = "average",
  poor = "poor",
}

function getPerformanceBand(score: number): {
  connection: ConnectionScoreBand;
  color: string;
} {
  if (score >= 90)
    return { connection: ConnectionScoreBand.excellent, color: "#00bc7d" };
  if (score >= 70)
    return { connection: ConnectionScoreBand.good, color: "#93d12f" };
  if (score >= 50)
    return { connection: ConnectionScoreBand.average, color: "#fe9a00" };
  return { connection: ConnectionScoreBand.poor, color: "#ff6467" };
}

const calculatePageCompression = (navigationTiming: any) => {
  const decoded = navigationTiming?.decodedBodySize;
  const encoded = navigationTiming?.encodedBodySize;

  if (!decoded || decoded === 0) return null;

  const byteSaved = decoded - encoded;

  const compressionPercentage = (byteSaved / decoded) * 100;

  return {
    percentage: `${compressionPercentage.toFixed(0)}%`,
    bytesSaved: byteSaved,
    isOptimized: compressionPercentage > 50,
  };
};

type FilterType =
  | "all"
  | "slow-host"
  | "uncompressed"
  | "high-queue"
  | "healthy";
