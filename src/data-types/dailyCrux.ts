type MetricHistogram = {
  histogram: {
    start: number | string;
    end?: number | string;
    density: number;
  }[];
};

type MetricPercentile = {
  percentiles: {
    p75: string;
  };
};

type MetricPercentileNumber = {
  percentiles: {
    p75: number;
  };
};

type DateRecord = {
  year: number;
  month: number;
  day: number;
};

export type DailyCruxData = {
  record: {
    key: {
      formFactor: "DESKTOP" | "PHONE" | "TABLET" | string;
      origin: string;
    };
    metrics: {
      cumulative_layout_shift: MetricHistogram & MetricPercentile;
      experimental_time_to_first_byte: MetricHistogram & MetricPercentileNumber;
      interaction_to_next_paint: MetricHistogram & MetricPercentileNumber;
      largest_contentful_paint: MetricHistogram & MetricPercentileNumber;
    };
    collectionPeriod: {
      firstDate: DateRecord;
      lastDate: DateRecord;
    };
  };
}[];

export type CruxMetricKey = keyof DailyCruxData[number]['record']['metrics'];

