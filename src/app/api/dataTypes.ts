import { Database } from "@/lib/db/database.types";

export type userData = Database["public"]["Tables"]["users"]["Insert"];

export type OrderData = Database["public"]["Tables"]["orders"]["Insert"];

export type PageQueue = Database["public"]["Tables"]["crux_jobs"]["Insert"];

export type Subscriptions =
  Database["public"]["Tables"]["subscriptions"]["Insert"];

export type PlanMetadata =
  Database["public"]["Tables"]["plan_metadata"]["Insert"];
