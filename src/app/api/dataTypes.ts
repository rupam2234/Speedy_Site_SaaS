import { Database } from "@/lib/db/database.types";

export type userData = Database["public"]["Tables"]["users"]["Insert"];

export type OrderData = Database["public"]["Tables"]["orders"]["Insert"];

export type PageQueue = Database["public"]["Tables"]["crux_jobs"]["Insert"];

export type Journey = Database["public"]["Tables"]["journeys"]["Insert"];

export type JourneySteps = Database["public"]["Tables"]["steps"]["Insert"];

export interface OrderPerPlan {
  free_users: number;
  basic_plan: number;
  pro: number;
}
