import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";
import { dispatchAssignmentNotification } from "@/lib/services/assignmentService";

const worker = setupDB();

// GET /api/admin/queue -> managed-WP orders with no active assignment + SLA indicators
export async function GET() {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { data: assigned, error: assignedError } = await (worker as any)
      .from("order_assignments")
      .select("order_id")
      .eq("is_active", true);

    if (assignedError) throw new Error(assignedError.message);

    const assignedIds = new Set((assigned ?? []).map((row: any) => row.order_id));

    const { data: orders, error } = await worker
      .from("orders")
      .select("order_id, user_id, website_name, website_address, order_date")
      .eq("order_status", true)
      .order("order_date", { ascending: true });

    if (error) throw new Error(error.message);

    const unassignedOrders = (orders ?? []).filter((row: any) => !assignedIds.has(row.order_id));

    // Get customer emails
    const userIds = Array.from(new Set(unassignedOrders.map((r: any) => r.user_id).filter(Boolean)));
    const { data: profiles } = await (worker as any)
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    const emailByUserId: Record<string, string> = {};
    for (const p of profiles ?? []) {
      if (p.id) emailByUserId[p.id] = p.email ?? "";
    }

    const now = Date.now();
    const queue = unassignedOrders.map((row: any) => {
      const orderDateMs = row.order_date ? new Date(row.order_date).getTime() : now;
      const ageHours = Math.max(0, (now - orderDateMs) / (1000 * 60 * 60));
      let urgency: "normal" | "warning" | "critical" = "normal";
      if (ageHours > 12) urgency = "critical";
      else if (ageHours > 4) urgency = "warning";

      return {
        orderId: row.order_id,
        userId: row.user_id,
        customerEmail: emailByUserId[row.user_id] || null,
        websiteName: row.website_name,
        websiteAddress: row.website_address,
        orderDate: row.order_date,
        ageHours: Math.round(ageHours * 10) / 10,
        urgency,
      };
    });

    return NextResponse.json({ queue }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/admin/queue -> Batch auto-assign all unassigned orders
export async function POST() {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { data: assigned, error: assignedError } = await (worker as any)
      .from("order_assignments")
      .select("order_id")
      .eq("is_active", true);

    if (assignedError) throw new Error(assignedError.message);
    const assignedIds = new Set((assigned ?? []).map((row: any) => row.order_id));

    const { data: orders, error } = await worker
      .from("orders")
      .select("order_id")
      .eq("order_status", true)
      .order("order_date", { ascending: true });

    if (error) throw new Error(error.message);

    const unassigned = (orders ?? []).filter((row: any) => !assignedIds.has(row.order_id));
    if (unassigned.length === 0) {
      return NextResponse.json({ message: "No unassigned orders found in queue", count: 0 }, { status: 200 });
    }

    let assignedCount = 0;
    for (const item of unassigned) {
      const { data: picked, error: pickError } = await (worker as any).rpc("pick_next_expert");
      if (pickError || !picked) break; // Expert pool full or error

      const { error: insertError } = await (worker as any)
        .from("order_assignments")
        .insert({
          order_id: item.order_id,
          expert_id: picked,
          assigned_by: gate.userId,
          status: "pending",
        });

      if (!insertError) {
        assignedCount++;
        await dispatchAssignmentNotification(item.order_id, picked);
      }
    }

    return NextResponse.json(
      {
        message: `Successfully assigned ${assignedCount} of ${unassigned.length} orders.`,
        assignedCount,
        totalUnassigned: unassigned.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
