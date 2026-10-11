import { cachedData, cleanExpiredCache } from "../cache";
import { browserClient } from "@/lib/db";

export async function validatePlan(userId: string) {
  const cacheKey = `user-plan:${userId}`;

  cleanExpiredCache({ prefix: "user-plan", session_Storage: true });

  const { response } = await cachedData({
    fn: fetchPlan,
    key: cacheKey,
    session_Storage: true,
    ttl: 2 * 60 * 1000,
  });

  async function fetchPlan() {
    // Plan is derived from the service model (user_services). The old
    // /api/subscriptions/plan route no longer exists; RLS lets the user
    // read their own services directly, so no API hop is needed.
    const { data, error } = await browserClient
      .from("user_services")
      .select("service_type")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    const hasManagedWp = data?.some((s) => s.service_type === "managed_wp");
    return [{ plan: hasManagedWp ? "Managed WP" : "Free" }];
  }

  return response;
}
