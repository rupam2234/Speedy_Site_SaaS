import React from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { useSiteContext } from "../../../siteContext";

interface MetricTrendProps {
  data: [string, number][];
  metric: string;
}

const SimpleTrendInsight = ({ data, metric }: MetricTrendProps) => {
  const { selectedDevice } = useSiteContext();

  // Ensure we have enough data to compare two weeks (14 days)
  if (!data || data.length < 14) {
    return (
      <div className="p-4 flex items-center gap-2 text-slate-400 text-[12px]">
        <AlertCircle size={14} />
        <span>Collecting more data to generate weekly trend analysis...</span>
      </div>
    );
  }

  // Extract Weeks
  const lastWeek = data.slice(-7);
  const prevWeek = data.slice(-14, -7);

  // Calculate Averages safely
  const avgA =
    lastWeek.reduce((acc, curr) => acc + curr[1], 0) / lastWeek.length;
  const avgB =
    prevWeek.reduce((acc, curr) => acc + curr[1], 0) / prevWeek.length;

  let diff = 0;
  if (avgB === 0) {
    diff = avgA > 0 ? 100 : 0;
  } else {
    diff = ((avgA - avgB) / avgB) * 100;
  }

  const absDiff = Math.abs(diff).toFixed(1);
  const isStable = Math.abs(diff) < 2;
  const isImprovement = diff < 0;

  const sentence = generateSentence();

  return (
    <div className="p-4 w-full">
      <div className="flex items-center gap-1">
        <div
          className={`shrink-0 ${
            isStable
              ? "text-slate-400"
              : isImprovement
                ? "text-emerald-500"
                : "text-rose-500"
          }`}
        >
          {isStable ? (
            <Minus size={18} />
          ) : isImprovement ? (
            <TrendingDown size={18} />
          ) : (
            <TrendingUp size={18} />
          )}
        </div>

        <div
          className={`text-[11px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
            isStable
              ? "bg-slate-100 text-slate-500"
              : isImprovement
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
          }`}
        >
          {isStable
            ? "No change"
            : `${absDiff}% ${isImprovement ? "Improved" : "Declined"}`}
        </div>

        <div>
          <p className="text-slate-700 text-[12px] font-medium leading-relaxed">
            {sentence}
          </p>
        </div>
      </div>
    </div>
  );

  function generateSentence() {
    const device = selectedDevice || "Site";

    if (isStable) {
      return `${device} ${metric} remained stable with negligible changes over the last seven days.`;
    }
    if (isImprovement) {
      return `${device} ${metric} improved by ${absDiff}% compared to previous week. Looks good so far.`;
    }
    return `${device} ${metric} worsened by ${absDiff}%, keep an eye on this metrics' trajectory.`;
  }
};

export default SimpleTrendInsight;
