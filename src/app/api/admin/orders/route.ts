import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// GET /api/admin/orders?status=unassigned|all&expertId=
// All managed-WP orders with their active assignment.
export async function GET(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("status") ?? "all";
    const expertId = searchParams.get("expertId");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? 50));

    let query = (worker as any)
      .from("orders")
      .select("order_id, user_id, website_name, website_address, order_status, order_date, order_assignments(id, expert_id, status, is_active, assigned_at, profiles:profiles!order_assignments_expert_id_fkey(email))", { count: "exact" })
      .eq("order_status", true)
      .order("order_date", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (expertId) {
      query = query.eq("order_assignments.expert_id", expertId).eq("order_assignments.is_active", true);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    let orders = (data ?? []).map((row: any) => {
      const active = (row.order_assignments ?? []).find((a: any) => a.is_active) ?? null;
      return {
        orderId: row.order_id,
        userId: row.user_id,
        websiteName: row.website_name,
        websiteAddress: row.website_address,
        orderDate: row.order_date,
        assignment: active
          ? {
              id: active.id,
              expertId: active.expert_id,
              expertEmail: active.profiles?.email ?? null,
              status: active.status,
              assignedAt: active.assigned_at,
            }
          : null,
      };
    });

    if (filter === "unassigned") orders = orders.filter((o: any) => o.assignment === null);

    return NextResponse.json({ orders, total: count ?? orders.length, page, pageSize }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
