export interface Histogram {
  start: string;
  end?: string;
  density: number;
}

export interface HistogramTimeseries {
  start: string;
  end?: string;
  densities: (string | number)[];
}

export interface PercentilesTimeseries {
  p75s: (number | null)[];
}

export interface Percentiles {
  p75: number | null;
}

export interface FractionTimeseries {
  phone: {
    fractions: any[];
  };
  tablet: {
    fractions: any[];
  };
  desktop: {
    fractions: any[];
  };
}

export interface Metric {
  histogramTimeseries?: HistogramTimeseries[];
  percentilesTimeseries?: PercentilesTimeseries;
  histogram?: Histogram[];
  percentiles?: Percentiles;
  fractionTimeseries?: FractionTimeseries;
}

export interface CollectionPeriod {
  firstDate: { year: number; month: number; day: number };
  lastDate: { year: number; month: number; day: number };
}

export type Metrics = {
  [metricName: string]: Metric;
};

export type RecordKey = {
  formFactor?: string;
  origin: string;
};

export interface CruxRecord {
  key: RecordKey;
  metrics: Metrics;
  collectionPeriods: CollectionPeriod[];
}

export interface CruxRecordWrapper {
  record: CruxRecord;
}

export type CruxData = CruxRecordWrapper;

export type DailyCrux = {
  website_name: string;
  device_type: "Desktop" | "Mobile" | "Tablet";
  record: CruxRecord;
};

export type PageCrux = {
  device_type: "Desktop" | "Mobile";
  record: CruxRecord;
  page_address: string;
};
