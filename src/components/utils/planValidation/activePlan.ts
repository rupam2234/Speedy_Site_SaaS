export async function validatePlan(userId: string) {
  const cacheKey = `user-plan-${userId}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const cacheAge = Date.now() - timestamp;

    // Invalidate after 10 minutes
    if (cacheAge < 10 * 60 * 1000) {
      return data;
    } else {
      sessionStorage.removeItem(cacheKey);
    }
  }

  // Fetch fresh
  const res = await fetch("/api/subscriptions/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    console.error("Unable to get user plan");
    return null;
  }

  const data = await res.json();
  sessionStorage.setItem(
    cacheKey,
    JSON.stringify({ data, timestamp: Date.now() })
  );

  return data;
}
