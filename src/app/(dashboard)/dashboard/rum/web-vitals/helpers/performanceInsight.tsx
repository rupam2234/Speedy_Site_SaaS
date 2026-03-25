import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  TriangleAlert,
  Lightbulb,
} from "lucide-react";
import { useSiteContext } from "../../../siteContext";
import { CustomTooltip } from "@/components/theme";
import Image from "next/image";

interface MetricTrendProps {
  data: [string, number][];
  metric: string;
}

const SimpleTrendInsight = ({ data, metric }: MetricTrendProps) => {
  const { selectedDevice } = useSiteContext();

  if (!data || data.length < 15) {
    return (
      <div className="p-4 flex items-center gap-2 text-slate-400 text-[12px]">
        <AlertCircle size={14} />
        <span>
          Collecting data to generate analysis... please check again within a
          few minutes.
        </span>
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

  // mean of absolute deviation
  function getMAD(values: number[], med: number) {
    const deviations = values.map((v) => Math.abs(v - med));
    return median(deviations);
  }

  // full 14 days to determine what "normal" variation looks like
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

  const avgPrev = average(prevValues);
  const avgLast = average(lastValues);
  const diff =
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
    <div className="py-4 pr-4 w-full">
      <div className="flex items-center gap-1">
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
              ? "bg-amber-50/80 text-amber-600"
              : isStable
                ? "bg-slate-100/80 text-slate-500"
                : isImprovement
                  ? "bg-emerald-50/80 text-emerald-600"
                  : "bg-rose-50/80 text-rose-600"
          }`}
        >
          {isAnomaly
            ? "Anomaly detected"
            : isStable
              ? "No change"
              : `${absDiff}% ${isImprovement ? "Improved" : "Declined"}`}
        </div>

        <p className="text-primary/80 text-[12px] font-semibold leading-relaxed">
          {generateSentence()}
        </p>
        <CustomTooltip
          content={
            <div className="space-y-3">
              <p>
                Weekly comparisons help reveal recent trends, but focus on
                consistent directional changes for reliable insights. RUM data
                can be more volatile than field data, so look for clear,
                sustained shifts that often indicates real impact.
              </p>
              <Image
                src={"/images/products/major-changes.png"}
                alt="major-changes"
                width={400}
                height={205}
                className="rounded-sm"
              />
              <p>
                Sustained positive or negative shifts in RUM data can eventually
                show up in your field metrics. Positive changes indicate
                improvement; negative ones suggest your UX metrics need
                attention.
              </p>
              <p>
                <span className="font-semibold">Additional tip:</span> fix the
                worst elements appears below, if there&apos;s any, can
                significantly improve your target metrics.
              </p>
            </div>
          }
          side="bottom"
          trigger={
            <Lightbulb
              size={22}
              className="ml-3 rounded-full p-1 bg-primary/10 text-primary/80 cursor-pointer fill-amber-300"
            />
          }
        />
      </div>
    </div>
  );

  function generateSentence() {
    const device = selectedDevice || "Site";

    if (isAnomaly) {
      return anomalyDirection === "spike"
        ? `${device} ${metric} shows an unusual spike (${(percentChangeFromMedian * 100).toFixed(0)}% above normal).`
        : `compared to historical patterns.`;
    }

    if (isStable) {
      return `remained stable compared to previous week.`;
    }

    return isImprovement
      ? `compared to the previous week.`
      : `compared to the previous week.`;
  }
};

export default SimpleTrendInsight;
