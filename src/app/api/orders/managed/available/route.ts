import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

/**
 * Can a site be connected right now without a new payment?
 *
 * The flow is per site, not per account:
 *  - a site that already has an order is already paid for, so it may continue;
 *  - a brand-new site needs an unused `managed_wp` entitlement (each purchase
 *    covers one site), which is why unconnected sites start with payment.
 */
export async function GET(req: Request) {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = normalizeDomain(new URL(req.url).searchParams.get("site"));

  try {
    // Already connected to this account: its entitlement was consumed by it.
    if (site) {
      const { data: existingOrder } = await worker
        .from("orders")
        .select("order_id")
        .eq("user_id", user.id)
        .eq("website_name", site)
        .maybeSingle();

      if (existingOrder) {
        return NextResponse.json(
          { available: true, reason: "already-connected" },
          { status: 200 },
        );
      }
    }

    const { data: services } = await worker
      .from("user_services")
      .select("id, website_name, metadata")
      .eq("user_id", user.id)
      .eq("service_type", "managed_wp")
      .eq("status", "active");

    // An entitlement still has room when it is not bound to a site yet.
    const unused = (services ?? []).find((s) => {
      const limit = (s.metadata as Record<string, any>)?.site_limit ?? 1;
      const used = s.website_name ? 1 : 0;
      return used < limit;
    });

    return NextResponse.json(
      {
        available: Boolean(unused),
        reason: unused ? "entitlement-available" : "payment-required",
        entitlementId: unused?.id ?? null,
      },
      { status: 200 },
    );
  } catch (err: any) {
    // Fail closed: the payment gate shows rather than unlocking a site.
    return NextResponse.json(
      { available: false, reason: "error", details: err?.message },
      { status: 200 },
    );
  }
}
