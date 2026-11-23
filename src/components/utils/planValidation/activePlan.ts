import { cachedData, cleanExpiredCache } from "../cache";
import { browserClient } from "@/lib/db";

/**
 * A paid service only counts while it is actually live:
 * `service_type = 'managed_wp'` + `status = 'active'` + expires_at in the
 * future or null.
 *
 * Same rule as `src/lib/wordpress/injection.ts` and the site-metadata worker
 * (docs/systems/site-metadata-worker.md). Matching on service_type alone made
 * cancelled / expired rows render "Managed WP" on /dashboard/pricing.
 */
function isLiveManagedWp(service: {
  service_type?: string | null;
  status?: string | null;
  expires_at?: string | null;
}): boolean {
  if (service.service_type !== "managed_wp") return false;
  if (service.status !== "active") return false;

  const expires = service.expires_at
    ? Date.parse(service.expires_at)
    : NaN;
  return Number.isNaN(expires) || expires > Date.now();
}

/** Return type for validatePlan including the expiry of the live managed_wp service */
export interface PlanValidationResult {
  plan: "Managed WP" | "Free";
  expiresAt: string | null; // ISO string of the live managed_wp service expires_at, or null
}

export async function validatePlan(userId: string): Promise<PlanValidationResult> {
  // ":v2" invalidates answers cached before the status/expires_at fix.
  // Still under the "user-plan" prefix, so cleanExpiredCache still sweeps it.
  const cacheKey = `user-plan:${userId}:v2`;

  cleanExpiredCache({ prefix: "user-plan", session_Storage: true });

  const { response } = await cachedData({
    fn: fetchPlan,
    key: cacheKey,
    session_Storage: true,
    ttl: 2 * 60 * 1000,
  });

  async function fetchPlan(): Promise<PlanValidationResult> {
    // Plan is derived from the service model (user_services). The old
    // /api/subscriptions/plan route no longer exists; RLS lets the user
    // read their own services directly, so no API hop is needed.
    const { data, error } = await browserClient
      .from("user_services")
      .select("service_type, status, expires_at")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    const liveService = data?.find((s) => isLiveManagedWp(s));
    const plan = liveService ? "Managed WP" : "Free";
    const expiresAt = liveService?.expires_at ?? null;

    return { plan, expiresAt };
  }

  return response;
}
