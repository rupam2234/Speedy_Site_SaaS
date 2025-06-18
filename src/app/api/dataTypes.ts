import { UUID } from "crypto";

export type userData = {
  email: string;
  firstname: string;
  lastname: string;
  id: string;
};

export type OrderData = {
  orderId?: UUID;
  orderDate?: string;
  websiteName: string;
  websiteAddress: string;
  user_email: string;
  order_status: boolean;
  cruxData: boolean;
  dailyMonitoring: boolean;
  performanceWarning: boolean;
  allowSpeedySite: boolean;
  favicon_file: string | null;
  rank: number | null;
  page_tracking: number | null;
};

export type originData = {
  data_id: UUID;
  created_at: string;
  lcp: Float32Array;
  cls: Float32Array;
  inp: Float32Array;
  fcp: Float32Array;
  ttfb: Float32Array;
  status: boolean;
  speed_index: Float32Array;
  website_name: string;
  device: string;
};
