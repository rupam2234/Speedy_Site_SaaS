export enum ReportVerbosty {
  summary = 1,
  analytics = 1 << 1,
  raw_data = 1 << 2,
}

export type ReportVerbostyTypes = {
  summary: boolean;
  analytics: boolean;
  raw_data: boolean;
};

export type OriginalRefs = {
  address: string;
  summary: boolean;
  analytics: boolean;
  raw_data: boolean;
};

export enum SaveStates {
  saving = 1,
  failed = 2,
  success = 3,
  ready = 4,
}
