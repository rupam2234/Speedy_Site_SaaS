import { cwv_ranges } from "../../cwvRanges";

export type Metric = "LCP" | "CLS" | "INP" | "TTFB" | "FCP";

const p75Template: Record<Metric, (value?: string) => string> = {
  LCP: (value) =>
    `${value}% of users sees the main content on your pages faster than the daily aggregate value shown on the graph.`,

  CLS: (value) =>
    `${value}% of users experiences stable page rendering than the daily aggregate value shown on the graph.`,

  INP: (value) =>
    `${value}% of your users had better interaction responsiveness than the daily aggregate value shown on the graph.`,

  TTFB: (value) =>
    `For ${value}% of your visitors, server response time was faster than the daily aggregate value shown on the graph.`,

  FCP: (value) =>
    `${value}% of your visitors have the first element of your page loaded within the daily aggregate value shown on the graph.`,
};

export function getP75Status({
  metric,
  activePercentile,
}: {
  metric: Metric;
  activePercentile: string;
}) {
  const p = activePercentile.slice(1);

  return p75Template[metric](p);
}

const shareBasedCWVRanges = {
  LCP: {
    Good: `faster than ${cwv_ranges.lcp[0]}ms`,
    Average: `between (${cwv_ranges.lcp[0]}ms - ${cwv_ranges.lcp[1]}ms)`,
    Poor: `slower than ${cwv_ranges.lcp[1]}ms`,
  },
  CLS: {
    Good: `better than ${cwv_ranges.cls[0]}`,
    Average: `between (${cwv_ranges.lcp[0]} - ${cwv_ranges.lcp[1]})`,
    Poor: `wose than ${cwv_ranges.cls[1]}`,
  },
  INP: {
    Good: `faster than ${cwv_ranges.inp[0]}ms`,
    Average: `between (${cwv_ranges.inp[0]}ms - ${cwv_ranges.inp[1]}ms)`,
    Poor: `slower than ${cwv_ranges.inp[1]}ms`,
  },
  TTFB: {
    Good: `faster than ${cwv_ranges.ttfb[0]}ms`,
    Average: `between (${cwv_ranges.ttfb[0]}ms - ${cwv_ranges.ttfb[1]}ms)`,
    Poor: `slower than ${cwv_ranges.ttfb[1]}ms`,
  },
  FCP: {
    Good: `faster than ${cwv_ranges.fcp[0]}ms`,
    Average: `between (${cwv_ranges.fcp[0]}ms - ${cwv_ranges.fcp[1]}ms)`,
    Poor: `slower than ${cwv_ranges.fcp[1]}ms`,
  },
};

const distStatus: Record<
  Metric,
  (value: number, share: "Good" | "Average" | "Poor") => string
> = {
  LCP: (value, share) =>
    `This means that for ${value?.toFixed(0)}% of visits, the main content on your pages loads ${shareBasedCWVRanges.LCP[share]} during the selected date range. ${share === "Good" ? "Anything above 75% often means your page loads fast for most of the users resulting in a safer LCP on web vital record." : ""}`,

  CLS: (value, share) =>
    `This means that for ${value?.toFixed(3)}% of visits, page stability during loads were ${shareBasedCWVRanges.CLS[share]} during the selected date range.`,

  INP: (value, share) =>
    `For ${value?.toFixed(0)}% of visits, interactions on your pages respond ${shareBasedCWVRanges.INP[share]} during the selected date range.`,

  TTFB: (value, share) =>
    `For ${value?.toFixed(0)}% of visits, the server responded ${shareBasedCWVRanges.TTFB[share]} during the selected date range`,

  FCP: (value, share) =>
    `For ${value?.toFixed(0)}% of visits, the first content on your pages appeared ${shareBasedCWVRanges.FCP[share]} during the selected date range.`,
};

export function getDistStatus({
  metric,
  percentage,
  share,
}: {
  percentage: number;
  share: "Good" | "Average" | "Poor";
  metric: Metric;
}) {
  return distStatus[metric](percentage, share);
}

const webVitalSidebarTips: Record<Metric, (metric?: string) => string> = {
  LCP: () =>
    `Average largest content load time across your website over the last 7 days.`,

  CLS: () =>
    `Average element stability across your website over the last 7 days.`,

  INP: () =>
    `Interaction responsiveness averaged over the last 7 days across your website.`,

  TTFB: () =>
    `Average server response time across your website over the last 7 days.`,

  FCP: () =>
    `Average time for first content to appear across your website over the last 7 days.`,
};

export function getSidebarTooltip({ metric }: { metric: Metric }) {
  return webVitalSidebarTips[metric]();
}
