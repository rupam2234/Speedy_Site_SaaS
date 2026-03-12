import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  TriangleAlert,
} from "lucide-react";
import { useSiteContext } from "../../../siteContext";

interface MetricTrendProps {
  data: [string, number][];
  metric: string;
}

const SimpleTrendInsight = ({ data, metric }: MetricTrendProps) => {
  const { selectedDevice } = useSiteContext();

  // 1. Need enough data to establish a pattern
  if (!data || data.length < 15) {
    return (
      <div className="p-4 flex items-center gap-2 text-slate-400 text-[12px]">
        <AlertCircle size={14} />
        <span>Collecting more data to generate weekly trend analysis...</span>
      </div>
    );
  }

  const dataWithoutToday = data.slice(0, -1);
  const lastWeek = dataWithoutToday.slice(-7);
  const prevWeek = dataWithoutToday.slice(-14, -7);

  function extractValues(arr: [string, number][]) {
    return arr
      .map((d) => d[1])
      .filter((v) => typeof v === "number" && !isNaN(v));
  }

  const allHistoricalValues = extractValues(dataWithoutToday);
  const prevValues = extractValues(prevWeek);
  const lastValues = extractValues(lastWeek);
  const latest = lastValues[lastValues.length - 1];

  function average(values: number[]) {
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  function median(values: number[]) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function getMAD(values: number[], med: number) {
    const deviations = values.map((v) => Math.abs(v - med));
    return median(deviations);
  }

  // Use the full 14 days to determine what "normal" variation looks like
  const historicalMedian = median(allHistoricalValues);
  const MAD = getMAD(allHistoricalValues, historicalMedian);

  // --- ANOMALY LOGIC REFINEMENT ---
  // Threshold: 5 * MAD is more robust for small samples than 3 * MAD.
  const madThreshold = 5 * MAD;
  // Minimum Change: Only call it an anomaly if the value moved by at least 15%
  // (prevents flagging tiny fluctuations when MAD is very low)
  const percentChangeFromMedian = Math.abs(
    (latest - historicalMedian) / historicalMedian,
  );
  const MIN_PERCENT_THRESHOLD = 0.15;

  const isAnomaly =
    MAD > 0 &&
    Math.abs(latest - historicalMedian) > madThreshold &&
    percentChangeFromMedian > MIN_PERCENT_THRESHOLD;

  const anomalyDirection = latest > historicalMedian ? "spike" : "drop";

  // --- TREND LOGIC ---
  const avgPrev = average(prevValues);
  const avgLast = average(lastValues);
  let diff =
    avgPrev === 0
      ? avgLast > 0
        ? 100
        : 0
      : ((avgLast - avgPrev) / avgPrev) * 100;

  const absDiff = Math.abs(diff).toFixed(1);
  const isStable = Math.abs(diff) < 2.5; // Slightly wider stability window
  const isImprovement = diff < 0; // Assuming lower is better for this metric

  const iconColor = isAnomaly
    ? "text-amber-500"
    : isStable
      ? "text-slate-400"
      : isImprovement
        ? "text-emerald-500"
        : "text-rose-500";

  return (
    <div className="p-4 w-full">
      <div className="flex items-center gap-2">
        <div className={`shrink-0 ${iconColor}`}>
          {isAnomaly ? (
            <TriangleAlert size={18} />
          ) : isStable ? (
            <Minus size={18} />
          ) : isImprovement ? (
            <TrendingDown size={18} />
          ) : (
            <TrendingUp size={18} />
          )}
        </div>

        <div
          className={`text-[11px] font-black uppercase px-2 py-0.5 rounded shrink-0
          ${
            isAnomaly
              ? "bg-amber-50 text-amber-600"
              : isStable
                ? "bg-slate-100 text-slate-500"
                : isImprovement
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
          }`}
        >
          {isAnomaly
            ? "Anomaly detected"
            : isStable
              ? "No change"
              : `${absDiff}% ${isImprovement ? "Improved" : "Declined"}`}
        </div>

        <p className="text-slate-700 text-[12px] font-medium leading-relaxed">
          {generateSentence()}
        </p>
      </div>
    </div>
  );

  function generateSentence() {
    const device = selectedDevice || "Site";

    if (isAnomaly) {
      return anomalyDirection === "spike"
        ? `${device} ${metric} shows an unusual spike (${(percentChangeFromMedian * 100).toFixed(0)}% above normal).`
        : `${device} ${metric} dropped unusually compared to historical patterns.`;
    }

    if (isStable) {
      return `${device} ${metric} remained stable over the last seven days.`;
    }

    return isImprovement
      ? `${device} ${metric} improved by ${absDiff}% compared to the previous week.`
      : `${device} ${metric} worsened by ${absDiff}% compared to the previous week.`;
  }
};

export default SimpleTrendInsight;
