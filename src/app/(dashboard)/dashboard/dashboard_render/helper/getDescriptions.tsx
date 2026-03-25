type Experience = "good" | "okay" | "poor";
type Metric = "LCP" | "CLS" | "INP" | "TTFB";

const expressions: Record<Metric, Record<Experience, string>> = {
  LCP: {
    good: "fast",
    okay: "moderately",
    poor: "slow",
  },
  CLS: {
    good: "stable",
    okay: "moderate",
    poor: "unstable",
  },
  INP: {
    good: "responsive",
    okay: "slightly delayed",
    poor: "unresponsive",
  },
  TTFB: {
    good: "quick",
    okay: "moderate",
    poor: "slow",
  },
};

const templates: Record<Metric, (p: number, exp: Experience) => string> = {
  LCP: (p, exp) =>
    `The main content across your pages loads ${expressions.LCP[exp]} for ${(p * 100).toFixed(2)}% of users.`,

  CLS: (p, exp) =>
    `For ${(p * 100).toFixed(2)}% of users, rendering stability across pages were ${expressions.CLS[exp]}.`,

  INP: (p, exp) =>
    `For ${(p * 100).toFixed(2)}% of users, page interections were ${expressions.INP[exp]}.`,

  TTFB: (p, exp) =>
    `For ${(p * 100).toFixed(2)}% of users, server response time were ${expressions.TTFB[exp]}.`,
};

export const getDescription = ({
  p,
  exp,
  metric,
}: {
  p: number;
  metric: Metric;
  exp: Experience;
}): string => {
  return templates[metric](p, exp);
};

const format = (value: unknown, digits: number) => {
  const num = Number(value);
  return isNaN(num) ? "0" : num.toFixed(digits);
};

const p75Template: Record<Metric, (value: number) => string> = {
  LCP: (value) =>
    `For 75% of users, main content loads faster than ${format(value, 0)}ms.`,

  CLS: (value) =>
    `75% of users have experienced rendering stability lower than ${format(value, 3)}.`,

  INP: (value) =>
    `75% of users have page interactions better than ${format(value, 0)}ms.`,

  TTFB: (value) =>
    `75% of users have server response time less than ${format(value, 0)}ms.`,
};

export const getP75Desc = ({
  metric,
  value,
}: {
  value: number;
  metric: Metric;
}) => {
  return p75Template[metric](value);
};
