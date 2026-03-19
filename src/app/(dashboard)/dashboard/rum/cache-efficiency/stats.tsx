"use client";

import { CacheEfficiency } from "@/app/api/dataTypes";
import { Activity, Zap, BarChart3, Clock, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useSiteContext } from "../../siteContext";

interface Props {
  data: CacheEfficiency[];
  isLoading: boolean;
}

export function OriginStatsOverview({ data, isLoading }: Props) {
  const { selectedSite } = useSiteContext();
  const [displaySuggestion, setDisplaySuggestion] = useState<boolean>(false);

  const totalSamples = data.reduce(
    (acc, curr) => acc + curr.total_origin_events,
    0,
  );
  const totalOriginHits = data.reduce(
    (acc, curr) => acc + curr.origin_hit_count,
    0,
  );

  const cacheEfficiency =
    totalSamples > 0
      ? ((totalSamples - totalOriginHits) / totalSamples) * 100
      : 0;

  const peakHour = [...data].sort(
    (a, b) => b.total_origin_events - a.total_origin_events,
  )[0];

  useEffect(() => {
    setDisplaySuggestion(false);

    const timer = setTimeout(() => {
      if (cacheEfficiency <= 30) setDisplaySuggestion(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [cacheEfficiency, selectedSite]);

  const stats = [
    {
      label: "Total Samples",
      value: totalSamples.toLocaleString(),
      icon: <BarChart3 className="text-blue-500" size={20} />,
      description: "Request samples to access a page",
    },
    {
      label: "Origin Hits",
      value: totalOriginHits.toLocaleString(),
      icon: <Activity className="text-orange-500" size={20} />,
      description: "Requests reaching primary server / host",
    },
    {
      label: "Cache Efficiency (higher is better)",
      value: `${cacheEfficiency.toFixed(2)}%`,
      icon: <Zap className="text-yellow-500" size={20} />,
      description: "Requests being served from your CDN.",
    },
    {
      label: "Peak Load (during max requests)",
      value: peakHour
        ? new Date(peakHour.agg_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A",
      icon: <Clock className="text-purple-500" size={20} />,
      description: peakHour
        ? `Cache efficiency of peak hour: ${100 - peakHour.origin_hit_percentage}%`
        : "N/A",
    },
  ];

  return (
    <>
      {isLoading || data.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-primary/5 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-4 rounded-sm border border-primary/10 bg-card dark:bg-secondary-background hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
          {displaySuggestion && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="w-full rounded-sm bg-primary/90 dark:bg-secondary-background text-primary-foreground dark:text-primary px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 bg-white/20 p-1.5 rounded-full">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>

                    <p className="text-xs font-medium leading-none tracking-tight">
                      Using a CDN service, such as Cloudflare&apos; can greatly
                      reduce latency. Once configured, try our cloudflare cache
                      rule enhancements and compare cache efficiency +
                      performance here.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* <button className="text-xs font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity">
                      Learn more
                    </button>
                    <button
                      onClick={() => setDisplaySuggestion(false)}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4 opacity-70" />
                    </button> */}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </>
  );
}
