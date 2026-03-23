export const getMetricColor = (v: number, good: number, poor: number) =>
  v <= good ? "#22c55e" : v <= poor ? "#eab308" : "#ef4444";

export const getDominantColor = (d: any, theme: string) => {
  const { p75_lcp, p75_cls, p75_inp, p75_ttfb } = d;
  if (p75_lcp > 4000 || p75_inp > 500 || p75_ttfb > 1800 || p75_cls > 0.25)
    return "#ef4444";
  if (p75_lcp > 2500 || p75_inp > 200 || p75_ttfb > 800 || p75_cls > 0.1)
    return "#eab308";
  return theme === "dark" ? "#22c55e" : "#66cc8f";
};
