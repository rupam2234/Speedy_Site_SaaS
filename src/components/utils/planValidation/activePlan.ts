import { cachedData, cleanExpiredCache } from "../cache";

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
    const res = await fetch("/api/subscriptions/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    const body: any = await res.json();

    if (!res.ok) {
      throw new Error(body.message ?? "error fetching plan");
    }

    return body.data;
  }

  return response;
}
