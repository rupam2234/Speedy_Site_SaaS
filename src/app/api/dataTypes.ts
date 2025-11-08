import { Database } from "@/lib/db/database.types";

export type OrderData = Database["public"]["Tables"]["orders"]["Insert"];

export type Subscriptions =
  Database["public"]["Tables"]["subscriptions"]["Insert"];

export type PlanMetadata =
  Database["public"]["Tables"]["plan_metadata"]["Insert"];

export type HappinessByGeo =
  Database["public"]["Tables"]["user_happiness_by_geo"]["Insert"];
