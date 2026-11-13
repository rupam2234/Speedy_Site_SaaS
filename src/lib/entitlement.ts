import { setupDB } from "@/lib/db";

const worker = setupDB();

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** The bits of a Stripe Checkout Session the entitlement needs. */
export type ProvisionableSession = {
  id: string;
  client_reference_id?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  customer?: string | { id: string } | null;
};

export type ProvisionResult = {
  provisioned: boolean;
  reason:
    | "provisioned"
    | "exists"
    | "no-user"
    | "wrong-amount"
    | "db-conflict";
};

/**
 * Provisions the `managed_wp` entitlement for a paid checkout session.
 *
 * Shared by the Stripe webhook and the reconcile-on-return endpoint so both
 * write exactly the same row. The `metadata->>'stripe_session_id'` unique index
 * (migration 20261107000002) is what makes this safe to call repeatedly: several
 * concurrent callers can pass the SELECT check at once, but only one insert can
 * commit, and the losers report "exists" instead of duplicating the grant.
 *
 * `expectedAmount` guards against paying for a different product: a session
 * that did not charge the managed_wp price never grants this entitlement.
 */
export async function provisionEntitlement(
  session: ProvisionableSession,
  expectedAmount?: number | null,
): Promise<ProvisionResult> {
  const userId = session.client_reference_id;
  if (!userId) return { provisioned: false, reason: "no-user" };

  if (
    expectedAmount != null &&
    session.amount_total != null &&
    session.amount_total !== expectedAmount
  ) {
    return { provisioned: false, reason: "wrong-amount" };
  }

  const { data: existing } = await worker
    .from("user_services")
    .select("id")
    .eq("service_type", "managed_wp")
    .eq("metadata->>stripe_session_id", session.id)
    .maybeSingle();

  if (existing) return { provisioned: false, reason: "exists" };

  const purchasedAt = new Date();
  const expiresAt = new Date(purchasedAt.getTime() + ONE_YEAR_MS);

  const { error } = await worker.from("user_services").insert({
    user_id: userId,
    service_type: "managed_wp",
    status: "active",
    purchased_at: purchasedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    metadata: {
      plan_name: "Managed WP",
      // $299 per site per year (docs/GOALS.md)
      site_limit: 1,
      stripe_session_id: session.id,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null),
      amount_total: session.amount_total ?? null,
      currency: session.currency ?? null,
    },
  });

  if (error) {
    // Lost the race against a concurrent caller — the unique index rejected
    // the duplicate, which is exactly the outcome we want.
    if ((error as { code?: string }).code === "23505") {
      return { provisioned: false, reason: "db-conflict" };
    }
    throw new Error(error.message);
  }

  return { provisioned: true, reason: "provisioned" };
}


/**
 * The plan the signed-in account currently resolves to, read straight from
 * `user_services` (no client cache) so a just-provisioned entitlement is
 * visible on the very next response.
 *
 * Mirrors `isLiveManagedWp` in
 * src/components/utils/planValidation/activePlan.ts.
 */
export async function resolvePlan(userId: string): Promise<{
  plan: "Managed WP" | "Free";
  expiresAt: string | null;
}> {
  const { data } = await worker
    .from("user_services")
    .select("service_type, status, expires_at")
    .eq("user_id", userId);

  const live = data?.find((s) => {
    if (s.service_type !== "managed_wp" || s.status !== "active") return false;
    if (!s.expires_at) return true;
    return Date.parse(s.expires_at) > Date.now();
  });

  return {
    plan: live ? "Managed WP" : "Free",
    expiresAt: live?.expires_at ?? null,
  };
}
