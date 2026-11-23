import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;
}

export async function POST(req: NextRequest) {
  try {
    // Use the same server-auth path as every other dashboard API. The old
    // route created a NextResponse.next() and a route-scoped Supabase client
    // before entering its try/catch; a failure there became an unstructured
    // 500 "Internal Server Error" with no usable diagnostic.
    const { user, error: authError } = await getSupabaseServerUser();
    if (authError || !user) {
      return NextResponse.json(
        { message: authError || "User unauthorized" },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Props>;
    const rawDomain = typeof body.domain === "string" ? body.domain.trim() : "";
    const normalized = normalizeDomain(rawDomain);

    if (!normalized) {
      return NextResponse.json(
        { message: "A valid domain is required" },
        { status: 400 },
      );
    }

    // Fetch every matching spelling owned by this user in one query. Older
    // orders may contain a raw hostname while newer ones use the normalized
    // hostname, so both candidates must be considered.
    const candidates = Array.from(
      new Set([rawDomain, normalized]),
    ).filter(Boolean);
    const { data: ownedOrders, error: lookupError } = await worker
      .from("orders")
      .select("website_name, order_id")
      .eq("user_id", user.id)
      .in("website_name", candidates)
      .limit(2);

    if (lookupError) throw new Error(lookupError.message);

    const verifiedOrder = (ownedOrders ?? []).find(
      (order) => normalizeDomain(order.website_name) === normalized,
    ) ?? ownedOrders?.[0];

    if (!verifiedOrder) {
      return NextResponse.json(
        { message: "Site not found for this account" },
        { status: 404 },
      );
    }

    // Remove the plugin credential first. wp_key.domain references the order
    // hostname, so deleting it explicitly avoids depending on cascade order.
    const { error: keyDeleteError } = await worker
      .from("wp_key")
      .delete()
      .eq("domain", normalizeDomain(verifiedOrder.website_name));
    if (keyDeleteError) throw new Error(keyDeleteError.message);

    // Detach the entitlement before removing its order link. This preserves
    // the account's paid/free service while freeing the deleted site slot.
    const { error: serviceUpdateError } = await worker
      .from("user_services")
      .update({
        order_id: null,
        website_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", verifiedOrder.order_id);
    if (serviceUpdateError) throw new Error(serviceUpdateError.message);

    // Scope the parent deletion to both the order and owner. A domain-only
    // filter is unnecessary and could delete another account's row if legacy
    // data ever violates the expected ownership invariant.
    const { data: deletedOrders, error: orderDeleteError } = await worker
      .from("orders")
      .delete()
      .eq("order_id", verifiedOrder.order_id)
      .eq("user_id", user.id)
      .select("order_id");
    if (orderDeleteError) throw new Error(orderDeleteError.message);

    if (!deletedOrders?.length) {
      throw new Error("The site could not be deleted. Please try again.");
    }

    return NextResponse.json(
      { message: "website deleted", orderId: verifiedOrder.order_id },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Error deleting website",
        error: error?.message || "Error deleting website",
      },
      { status: 500 },
    );
  }
}
