import Image from "next/image";
import React from "react";

export type AggregatedMetrics = {
  device_type: "desktop" | "mobile";
  country: string[];
  total_page_views: number;
  total_sessions: number;
  unique_visitors: number;
  unique_languages: number;
  bounce_rate_percentage: number;
  avg_pages_per_session: number;
};

type Props = {
  data: AggregatedMetrics;
};

export default function AnalyticsOverview({ data }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 border rounded-sm border-accent-foreground/20 dark:bg-secondary-background bg-primary-foreground p-4">
      <div className="col-span-1">
        <p className="text-sm">Page Views:</p>
        <div className="font-semibold text-2xl">
          {new Intl.NumberFormat("en", {
            notation: "compact",
            compactDisplay: "short",
          }).format(data?.total_page_views)}
        </div>
      </div>
      <div className="col-span-1">
        <p className="text-sm">Sessions:</p>
        <div className="font-semibold text-2xl">
          {new Intl.NumberFormat("en", {
            notation: "compact",
            compactDisplay: "short",
          }).format(data?.total_sessions)}
        </div>
      </div>
      <div className="col-span-1">
        <p className="text-sm">Bounce Rate:</p>
        <div className="font-semibold text-2xl">
          {new Intl.NumberFormat("en", {
            notation: "compact",
            compactDisplay: "short",
          }).format(data?.bounce_rate_percentage)}
          %
        </div>
      </div>
      <div className="col-span-1">
        <p className="text-sm">Avg. Page Per Session:</p>
        <div className="font-semibold text-2xl">
          {new Intl.NumberFormat("en", {
            notation: "compact",
            compactDisplay: "short",
          }).format(data?.avg_pages_per_session)}
        </div>
      </div>
      <div className="col-span-1">
        <p className="text-sm mb-2">Most Visitors By Countries:</p>
        <div className="flex flex-wrap gap-1">
          {data?.country.slice(0, 6).map((code) => (
            <Image
              key={code}
              src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
              alt={code}
              title={code}
              className="w-6 h-4 object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
