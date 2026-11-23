import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

// The three setup steps, aligned 1:1 with the onboarding progress bar
// (Site -> Plugin -> Activate) and stored as keys of orders.tour:
//   0 site_selected   - the account has this site connected
//   1 plugin_verified - the WP plugin's HMAC signature verified against wp_key
//   2 service_active  - payment completed (also written by the payment
//                       finalization, see finalizePaidOrder in @/lib/entitlement)
const STEP_KEYS = [
  "site_selected",
  "plugin_verified",
  "service_active",
] as const;

/**
 * Records one setup step for a site.
 *
 * Setup progress lives on the `orders` row itself (`tour` + `setup_step`), so
 * orders is the single table for site management -- there is no separate
 * onboarding table to keep in sync.
 */
export async function POST(req: Request) {
  const { user, error } = await getSupabaseServerUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { site, step }: { site?: string; step?: number } = await req.json();
    const websiteName = normalizeDomain(site);

    if (!websiteName) {
      return NextResponse.json({ error: "site is required" }, { status: 400 });
    }
    if (typeof step !== "number" || !STEP_KEYS[step]) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const { data: order } = await worker
      .from("orders")
      .select("order_id, tour, setup_step, order_status")
      .eq("user_id", user.id)
      .eq("website_name", websiteName)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { error: "Connect this site to your account first" },
        { status: 403 },
      );
    }

    const key = STEP_KEYS[step];
    const tour = {
      ...((order.tour as Record<string, boolean> | null) ?? {}),
      [key]: true,
    };

    // Steps that depend on external state are validated server-side: the
    // client must not be able to claim a step without the actual proof.
    if (key === "plugin_verified") {
      const { data: wpKey } = await worker
        .from("wp_key")
        .select("hmac_verified_at")
        .eq("domain", websiteName)
        .maybeSingle();
      if (
        !(wpKey as { hmac_verified_at: string | null } | null)?.hmac_verified_at
      ) {
        return NextResponse.json(
          {
            error:
              "Plugin not verified. Install the plugin and verify the connection first.",
          },
          { status: 400 },
        );
      }
    }

    if (key === "service_active" && order.order_status !== true) {
      return NextResponse.json(
        { error: "Payment not completed for this site yet." },
        { status: 400 },
      );
    }

    const setup_step = Math.max(order.setup_step ?? 0, step + 1);

    const { data: updated, error: updateError } = await worker
      .from("orders")
      .update({
        tour,
        setup_step,
        // The last step (payment) means the setup is finished.
        ...(key === "service_active"
          ? { setup_completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("order_id", order.order_id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to record step",
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to record step", message: err?.message },
      { status: 500 },
    );
  }
}
