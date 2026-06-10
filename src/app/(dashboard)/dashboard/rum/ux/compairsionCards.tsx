import { useMemo } from "react";

export type CompareCardProps = {
  label: string;
  valueA: number;
  valueB: number;
  metric: "cls" | "lcp" | "inp" | "ttfb";
};

export function ComparisonCard({
  label,
  metric,
  valueA,
  valueB,
}: CompareCardProps) {
  const noChange = valueA === valueB;
  const remark = getChange(metric, valueA, valueB);
  const gap = useMemo(
    () => (valueA && valueB ? diff(valueA, valueB) : valueA || valueB),
    [valueA, valueB],
  );

  const bgColor = getBgColor(remark);

  return (
    <div
      className="rounded-sm border border-primary/10 p-3 dark:text-primary/80 text-primary font-medium text-xs"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="font-medium uppercase tracking-wide">{label}</h4>
        <span>{remark}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span>A</span>
          <span>{valueA || "--"}</span>
        </div>

        <div className="flex justify-between">
          <span>B</span>
          <span>{valueB || "--"}</span>
        </div>

        <div className="flex justify-between border-t border-primary/20 pt-2 ">
          <span>Gap</span>
          <span className="font-medium">{gap?.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  function getChange(
    metric: "cls" | "lcp" | "inp" | "ttfb",
    valueA: number,
    valueB: number,
  ) {
    if (noChange) return "No Change";

    if (!valueA || !valueB) {
      return "Missing Data";
    }

    const better = valueA < valueB;

    return metric === "cls"
      ? better
        ? "Better"
        : "Worse"
      : better
        ? "Faster"
        : "Slower";
  }
}

function diff(a: number, b: number) {
  if (!a) return 0;

  return ((b - a) / a) * 100;
}

const getBgColor = (
  status:
    | "Missing Data"
    | "No Change"
    | "Faster"
    | "Slower"
    | "Better"
    | "Worse",
) => {
  if (status === "Missing Data" || status === "No Change")
    return BgColor.neutral;
  if (status === "Better" || status === "Faster") return BgColor.good;
  else return BgColor.poor;
};

enum BgColor {
  good = "rgba(21, 159, 20, 0.2)",
  poor = "rgba(190, 75, 75, 0.2)",
  neutral = "rgba(219, 219, 219, 0.8)",
}
