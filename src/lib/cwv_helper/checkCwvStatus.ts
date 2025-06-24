import { Helpers } from "@/app/(dashboard)/dashboard/[sites]/cwv/helper/helperFunc";
import { getColor } from "./getColor";
import { Metric } from "@/data/cruxData";

export type CWVStatus = "passed" | "needs-improvement" | "failed";

export interface CWVCheck {
  metricKey: string;
  label: string;
  value: number | string;
  colorClass: string;
}

export interface CWVStatusResult {
  status: CWVStatus;
  label: string;
  colorClass: string;
  checks: CWVCheck[];
}

const METRIC_KEYS: { key: string; label: string }[] = [
  { key: "largest_contentful_paint", label: "LCP" },
  { key: "interaction_to_next_paint", label: "INP" },
  { key: "cumulative_layout_shift", label: "CLS" },
];

const STATUS_LABELS: Record<CWVStatus, string> = {
  passed: "Passed",
  "needs-improvement": "Needs Improvement",
  failed: "Failed",
};
export function getCWVStatus(
  metrics: Record<string, Metric | undefined>
): CWVStatusResult {
  const helper = new Helpers();

  const checks: CWVCheck[] = METRIC_KEYS.map(({ key, label }) => {
    const value = helper.getLatestP75(metrics[key]);

    const colorClass =
      typeof value === "number"
        ? getColor(key, value)
        : "text-muted-foreground"; // fallback for no data

    return { metricKey: key, label, value: value ?? "N/A", colorClass };
  });

  const allValuesMissing = checks.every((check) => check.value === "--");

  if (allValuesMissing) {
    return {
      status: "passed", // status stays the same unless you want to add a new one
      label: "N/A", // This is where label changes
      colorClass: "text-muted-foreground",
      checks,
    };
  }

  const failed = checks.some((check) => check.colorClass.includes("red"));
  const needsImprovement = checks.some((check) =>
    check.colorClass.includes("yellow")
  );

  let status: CWVStatus = "passed";
  if (failed) status = "failed";
  else if (needsImprovement) status = "needs-improvement";

  const colorClass =
    checks.find((check) =>
      check.colorClass.includes(
        status === "failed"
          ? "red"
          : status === "needs-improvement"
          ? "yellow"
          : "green"
      )
    )?.colorClass || "text-muted-foreground";

  return {
    status,
    label: STATUS_LABELS[status],
    colorClass,
    checks,
  };
}
