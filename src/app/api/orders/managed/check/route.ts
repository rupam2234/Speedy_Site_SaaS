import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

/**
 * GET /api/orders/managed/check?site=domain
 *
 * Lightweight check: does this site already have an order for the signed-in user?
 * Used before the add-site flow to avoid redundant favicon upload + order creation.
 */
export async function GET(req: Request) {
  const { user, error: authError } = await getSupabaseServerUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Missing user authentication" }, { status: 401 });
  }

  const site = normalizeDomain(new URL(req.url).searchParams.get("site") ?? "");
  if (!site) {
    return NextResponse.json({ error: "site is required" }, { status: 400 });
  }

  try {
    const { data: existing } = await worker
      .from("orders")
      .select("order_id, website_name, website_address, order_status, product_type")
      .eq("user_id", user.id)
      .eq("website_name", site)
      .maybeSingle();

    return NextResponse.json(
      {
        exists: Boolean(existing),
        order: existing ?? null,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error checking existing site", details: err?.message },
      { status: 500 },
    );
  }
}
