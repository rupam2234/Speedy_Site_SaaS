export async function validatePlan(userId: string) {
  const res = await fetch("/api/subscriptions/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    console.error("Unable to get user plan");
    return;
  }

  const body = await res.json();
  return body;
}
