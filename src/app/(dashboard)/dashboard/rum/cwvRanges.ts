export const cwv_ranges = {
  lcp: [2500, 4000],
  fcp: [1800, 3000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  ttfb: [800, 1800],
};

// to normalize web vitals values
export function scoreMetric(value: number, range: number[]) {
  const [good, poor] = range;

  if (value < good) return 1;
  else if (value >= poor) return 0;

  return (poor - value) / (poor - good);
}
