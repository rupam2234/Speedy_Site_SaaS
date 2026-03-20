"use client";

import { CacheEfficiency } from "@/app/api/dataTypes";
import { Activity, Zap, BarChart3, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteContext } from "../../siteContext";
import { CustomTooltip } from "@/components/theme";

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
  ];

  return (
    <>
      {isLoading || data.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-primary/5 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-4 rounded-sm border border-primary/10 bg-card dark:bg-secondary-background hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  {displaySuggestion &&
                  stat.description ===
                    "Requests being served from your CDN." ? (
                    <CustomTooltip
                      content={
                        <p>
                          Using a CDN service, can greatly reduce latency for
                          regions far from your server. If your site is
                          connected to Cloudflare try our cache rule
                          enhancements and compare cache efficiency + TTFB
                          afterwards.
                        </p>
                      }
                      side="bottom"
                      trigger={
                        <Lightbulb
                          size={20}
                          className="ml-3 rounded-full p-1 bg-primary/10 text-primary/80 cursor-pointer fill-amber-300"
                        />
                      }
                    />
                  ) : (
                    stat.icon
                  )}
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
        </>
      )}
    </>
  );
}
