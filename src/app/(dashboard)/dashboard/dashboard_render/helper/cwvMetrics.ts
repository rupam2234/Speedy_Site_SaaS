import { CruxMetricKey } from "@/data-types/dailyCrux";

export type CWVMetric = {
  label: string;
  key: CruxMetricKey;
  unit?: string;
  acronym: string;
};

export const cwv_metrics: CWVMetric[] = [
  {
    label: "Largest Contentful Paint",
    key: "largest_contentful_paint",
    acronym: "LCP",
    unit: "ms",
  },
  {
    label: "Interaction to Next Paint",
    key: "interaction_to_next_paint",
    acronym: "INP",
    unit: "ms",
  },
  {
    label: "Cumulative Layout Shifts",
    key: "cumulative_layout_shift",
    acronym: "CLS",
    unit: "",
  },
  {
    label: "Time to First Byte",
    key: "experimental_time_to_first_byte",
    acronym: "TTFB",
    unit: "ms",
  },
];


