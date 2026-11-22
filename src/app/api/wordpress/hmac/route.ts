import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";
import { prepareSignature } from "@/lib/wordpress/hmac";

const worker = setupDB();

// Prepares the HMAC signature the WP plugin carries (plugin step).
// Only the user who connected the site can bind a signature to it.
export async function POST(req: NextRequest) {
  const { user, error } = await getSupabaseServerUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { domain }: { domain?: string } = await req.json();
    const normalized = normalizeDomain(domain);

    if (!normalized) {
      return NextResponse.json(
        { error: "domain is required" },
        { status: 400 },
      );
    }

    const { data: order } = await worker
      .from("orders")
      .select("website_name, tour")
      .eq("user_id", user.id)
      .eq("website_name", normalized)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { error: "Connect this site to your account first" },
        { status: 403 },
      );
    }

    const result = await prepareSignature(normalized);

    // A freshly prepared signature invalidates any previous verification on
    // this site. Clear the tour flag so the header can't show "verified" from
    // a stale signature.
    if (order) {
      await worker
        .from("orders")
        .update({
          tour: {
            ...((order.tour as Record<string, boolean> | null) ?? {}),
            plugin_verified: false,
          },
        })
        .eq("website_name", normalized);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to prepare signature", message: err?.message },
      { status: 500 },
    );
  }
}
