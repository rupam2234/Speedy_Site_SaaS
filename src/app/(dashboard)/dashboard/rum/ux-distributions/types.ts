export type UxGranularData = {
  country: string;
  device_type: string;
  network: string;
  total_sessions: number;
  p75_lcp: number;
  p75_ttfb: number;
  p75_cls: number;
  p75_inp: number;
  good_pct: number;
  average_pct: number;
  bad_pct: number;
};

export type ComparisonData = {
  segA: {
    country: string;
    device_type: string;
    network: string;
    total_sessions: number;
    p75_lcp: number;
    p75_ttfb: number;
    p75_cls: number;
    p75_inp: number;
    good_pct: number;
    average_pct: number;
    bad_pct: number;
  };
  segB: {
    country: string;
    device_type: string;
    network: string;
    total_sessions: number;
    p75_lcp: number;
    p75_ttfb: number;
    p75_cls: number;
    p75_inp: number;
    good_pct: number;
    average_pct: number;
    bad_pct: number;
  };
  lcpDiff: number;
  inpDiff: number;
  ttfbDiff: number;
  clsDiff: number;
} | null;
