import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// GET /api/admin/stats -> operational metrics and recent activity
export async function GET() {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    // 1. Get all active orders
    const { data: allOrders, error: ordersError } = await worker
      .from("orders")
      .select("order_id, website_name, website_address, order_date")
      .eq("order_status", true)
      .order("order_date", { ascending: false });

    if (ordersError) throw new Error(ordersError.message);

    // 2. Get active assignments
    const { data: assignments, error: assignError } = await (worker as any)
      .from("order_assignments")
      .select("id, order_id, expert_id, status, is_active, assigned_at, completed_at")
      .order("assigned_at", { ascending: false });

    if (assignError) throw new Error(assignError.message);

    // Fetch expert profile emails
    const expertIds = Array.from(new Set((assignments ?? []).map((a: any) => a.expert_id).filter(Boolean)));
    const { data: expertProfiles } = await (worker as any)
      .from("profiles")
      .select("id, email")
      .in("id", expertIds);

    const emailByExpertId: Record<string, string> = {};
    for (const p of expertProfiles ?? []) emailByExpertId[p.id] = p.email ?? "";

    const activeAssignments = (assignments ?? []).filter((a: any) => a.is_active);
    const assignedOrderIds = new Set(activeAssignments.map((a: any) => a.order_id));

    // Queue count & critical SLA count
    const now = Date.now();
    let unassignedCount = 0;
    let criticalSlaCount = 0;
    for (const order of allOrders ?? []) {
      if (!assignedOrderIds.has(order.order_id)) {
        unassignedCount++;
        const ageHours = (now - new Date(order.order_date).getTime()) / (1000 * 60 * 60);
        if (ageHours > 12) criticalSlaCount++;
      }
    }

    // Status breakdown
    let inProgressCount = 0;
    let completedCount = 0;
    let pendingAcceptCount = 0;
    for (const a of activeAssignments) {
      if (a.status === "in_progress" || a.status === "accepted") inProgressCount++;
      else if (a.status === "completed") completedCount++;
      else if (a.status === "pending") pendingAcceptCount++;
    }

    // 3. Expert Pool stats
    const { data: experts, error: expertsError } = await (worker as any)
      .from("experts_pool")
      .select("expert_id, capacity, is_available");

    if (expertsError) throw new Error(expertsError.message);

    const totalExperts = (experts ?? []).length;
    const availableExperts = (experts ?? []).filter((e: any) => e.is_available).length;
    const totalCapacity = (experts ?? []).reduce((acc: number, e: any) => acc + (e.capacity || 0), 0);
    const totalActiveLoad = activeAssignments.filter((a: any) =>
      ["pending", "accepted", "in_progress"].includes(a.status)
    ).length;

    // 4. Open tickets count
    const { count: openTicketsCount } = await worker
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed");

    // 5. Recent Activity (last 10 events)
    const recentActivity: Array<{ id: string; type: string; title: string; subtitle: string; time: string }> = [];

    // Recent assignments
    for (const a of (assignments ?? []).slice(0, 5)) {
      const relatedOrder = (allOrders ?? []).find((o: any) => o.order_id === a.order_id);
      recentActivity.push({
        id: a.id,
        type: a.status === "completed" ? "completed" : "assigned",
        title: a.status === "completed" ? "Optimization Completed" : `Assigned to ${emailByExpertId[a.expert_id] || "expert"}`,
        subtitle: relatedOrder?.website_name ?? relatedOrder?.website_address ?? "Website Order",
        time: a.completed_at || a.assigned_at,
      });
    }

    // Recent orders
    for (const o of (allOrders ?? []).slice(0, 5)) {
      recentActivity.push({
        id: o.order_id,
        type: "order",
        title: "New Managed WP Order",
        subtitle: o.website_name ?? o.website_address ?? "Website",
        time: o.order_date,
      });
    }

    recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json(
      {
        metrics: {
          totalOrders: (allOrders ?? []).length,
          unassignedQueue: unassignedCount,
          criticalSla: criticalSlaCount,
          inProgress: inProgressCount,
          pendingAccept: pendingAcceptCount,
          completed: completedCount,
          totalExperts,
          availableExperts,
          totalCapacity,
          totalActiveLoad,
          openTickets: openTicketsCount ?? 0,
        },
        recentActivity: recentActivity.slice(0, 8),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
