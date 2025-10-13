export interface DomainData {
  domain: string;
  category: string;
  cached: boolean;
  overridden?: boolean;
  frequency: number;

  // Add these for performance tracking
  performance: "good" | "average" | "poor";
  averageDuration: number;
  averageTTFB: number;
  count: number;
  totalTransferSize: number;
}
