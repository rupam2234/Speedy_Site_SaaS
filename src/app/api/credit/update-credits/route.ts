import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  const supabase = setupDB();
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET_TOKEN;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all orders with billing_cycle_start and user info
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        "order_id, user_email, website_address, billing_cycle_start, has_lab_access, has_rum_access, users(id)"
      )
      .not("billing_cycle_start", "is", null);

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { message: "No orders with billing_cycle_start found" },
        { status: 200 }
      );
    }

    const now = new Date();

    function getBillingCycleStart(startStr: string) {
      const start = new Date(startStr);
      const cycle = new Date(start);
      while (cycle <= now) {
        cycle.setMonth(cycle.getMonth() + 1);
      }
      cycle.setMonth(cycle.getMonth() - 1);
      return cycle;
    }

    for (const order of orders) {
      const billingCycleStart = getBillingCycleStart(
        order.billing_cycle_start!
      );
      const billingCycleEnd = new Date(billingCycleStart);
      billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

      const userId = order.users?.id;
      if (!userId) continue;

      // LAB credits logic
      if (order.has_lab_access) {
        const { count: labCount, error: labErr } = await supabase
          .from("pageperf_data")
          .select("record_id", { count: "exact", head: true })
          .ilike("page_address", `${order.website_address}%`)
          .gte("created_at", billingCycleStart.toISOString())
          .lt("created_at", billingCycleEnd.toISOString());

        if (labErr) throw labErr;
        const labCredits = (labCount ?? 0) * 3;

        const { error: upsertLabErr } = await supabase.from("credit").upsert(
          {
            user_id: userId,
            site_id: order.order_id,
            user_email: order.user_email,
            period_start: billingCycleStart.toISOString(),
            period_end: billingCycleEnd.toISOString(),
            lab_credits: labCredits,
            rum_pageviews: 0,
            updated_at: new Date().toISOString(),
            module: "lab",
          },
          {
            onConflict: "user_id,site_id,period_start,module",
          }
        );

        if (upsertLabErr) throw upsertLabErr;
      }

      // Optional: Uncomment RUM logic if needed
      /*
      if (order.has_rum_access) {
        const { count: rumCount, error: rumErr } = await supabase
          .from("rum_results")
          .select("id", { count: "exact", head: true })
          .eq("order_id", order.order_id)
          .gte("created_at", billingCycleStart.toISOString())
          .lt("created_at", billingCycleEnd.toISOString());

        if (rumErr) throw rumErr;

        const { error: upsertRumErr } = await supabase.from("credit").upsert(
          {
            user_id: userId,
            site_id: order.order_id,
            period_start: billingCycleStart.toISOString(),
            period_end: billingCycleEnd.toISOString(),
            rum_pageviews: rumCount ?? 0,
            updated_at: new Date().toISOString(),
            module: "rum",
          },
          {
            onConflict: "user_id,site_id,period_start,module",
          }
        );

        if (upsertRumErr) throw upsertRumErr;
      }
      */
    }

    return NextResponse.json({ message: "Credits updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
