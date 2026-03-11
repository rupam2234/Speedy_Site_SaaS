import { Database } from "@/lib/db/database.types";

export type OrderData = Database["public"]["Tables"]["orders"]["Insert"];

export type Subscriptions =
  Database["public"]["Tables"]["subscriptions"]["Insert"];

export type PlanMetadata =
  Database["public"]["Tables"]["plan_metadata"]["Insert"];

export type Rum_history =
  Database["public"]["Tables"]["rum_history_new"]["Insert"];

export type CloudflareConfig =
  Database["public"]["Tables"]["cloudflare_auth"]["Insert"];

export type SpeedySiteTickets = Database["public"]["Tables"]["tickets"]["Insert"];

export type TicketMessages = Database["public"]["Tables"]["ticket_messages"]["Insert"]

export type OriginHits = Database["public"]["Tables"]["rum_origin_hits_agg"]["Insert"]

export type WordPress_key = Database["public"]["Tables"]["wp_key"]["Insert"]

