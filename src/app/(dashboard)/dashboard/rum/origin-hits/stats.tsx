"use client";

import { OriginHits } from "@/app/api/dataTypes";
import { Activity, Zap, BarChart3, Clock } from "lucide-react";

interface Props {
  data: OriginHits[];
  isLoading: boolean;
}

export function OriginStatsOverview({ data, isLoading }: Props) {
  if (isLoading || data.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-primary/5 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const totalEvents = data.reduce(
    (acc, curr) => acc + curr.total_origin_events,
    0,
  );
  const totalHits = data.reduce((acc, curr) => acc + curr.origin_hit_count, 0);
  const avgHitRate = totalEvents > 0 ? (totalHits / totalEvents) * 100 : 0;

  // Find Peak Traffic Hour
  const peakHour = [...data].sort(
    (a, b) => b.total_origin_events - a.total_origin_events,
  )[0];

  const stats = [
    {
      label: "Total Requests",
      value: totalEvents.toLocaleString(),
      icon: <BarChart3 className="text-blue-500" size={20} />,
      description: "Total server attempts",
    },
    {
      label: "Origin Hits",
      value: totalHits.toLocaleString(),
      icon: <Activity className="text-orange-500" size={20} />,
      description: "Requests reaching server",
    },
    {
      label: "Avg. Hit Rate",
      value: `${avgHitRate.toFixed(1)}%`,
      icon: <Zap className="text-yellow-500" size={20} />,
      description: "Efficiency vs Cache",
    },
    {
      label: "Peak Load",
      value: peakHour
        ? new Date(peakHour.agg_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A",
      icon: <Clock className="text-purple-500" size={20} />,
      description: `${peakHour?.total_origin_events || 0} reqs at this hour`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="p-4 rounded-xl border border-primary/10 bg-card dark:bg-secondary-background hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </span>
            {stat.icon}
          </div>
          <div className="text-2xl font-bold text-primary">{stat.value}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
}
