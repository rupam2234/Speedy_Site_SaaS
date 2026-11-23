import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

/**
 * Is payment complete for this site?
 *
 * Payment = an active managed_wp entitlement that is linked to an order
 * (order_id set) and bound to this site (website_name matches).
 */
export async function GET(req: Request) {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = normalizeDomain(new URL(req.url).searchParams.get("site"));

  if (!site) {
    return NextResponse.json({ error: "Missing site" }, { status: 400 });
  }

  try {
    const { data: services } = await worker
      .from("user_services")
      .select("id, order_id, website_name, status")
      .eq("user_id", user.id)
      .eq("service_type", "managed_wp")
      .eq("status", "active")
      .not("order_id", "is", null)
      .eq("website_name", site)
      .maybeSingle();

    return NextResponse.json({
      paid: Boolean(services),
    });
  } catch (err: any) {
    return NextResponse.json(
      { paid: false, error: err?.message },
      { status: 200 },
    );
  }
}
