import { Database } from "@/lib/db/database.types";

export type userData = Database["public"]["Tables"]["users"]["Insert"];

export type OrderData = Database["public"]["Tables"]["orders"]["Insert"];

export type PageQueue = Database["public"]["Tables"]["crux_jobs"]["Insert"];

export interface OrderPerPlan {
  free_users: number;
  basic_plan: number;
  pro: number;
}
