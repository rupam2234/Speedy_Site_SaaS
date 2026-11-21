import { NextResponse } from "next/server";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { setupDB } from "@/lib/db";
import { normalizeDomain } from "@/lib/wordpress/domain";

const worker = setupDB();

// Setup step keys, in tour order (docs/systems/user-onboarding-flow.md §4.2).
// The user walks four steps; preparing the signature and assigning the
// collector are recorded silently behind the plugin download + verification,
// so one UI step writes more than one key.
const STEP_KEYS = [
  "site_selected",
  "signature_bound",
  "plugin_installed",
  "signature_verified",
  "rum_assigned",
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
      .select("order_id, tour, setup_step")
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
    const setup_step = Math.max(order.setup_step ?? 0, step + 1);

    const { data: updated, error: updateError } = await worker
      .from("orders")
      .update({
        tour,
        setup_step,
        // The last key in the chain means the setup is finished.
        ...(key === "rum_assigned"
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
