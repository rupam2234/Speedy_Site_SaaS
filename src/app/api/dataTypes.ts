import { Database } from "@/lib/db/database.types";

export type userData = Database["public"]["Tables"]["users"]["Insert"];

export type OrderData = Database["public"]["Tables"]["orders"]["Insert"];

// export type originData = {
//   data_id: UUID;
//   created_at: string;
//   lcp: Float32Array;
//   cls: Float32Array;
//   inp: Float32Array;
//   fcp: Float32Array;
//   ttfb: Float32Array;
//   status: boolean;
//   speed_index: Float32Array;
//   website_name: string;
//   device: string;
// };
