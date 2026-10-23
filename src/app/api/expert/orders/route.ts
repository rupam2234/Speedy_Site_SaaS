import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// GET /api/expert/orders -> only the signed-in expert's active assignments
export async function GET() {
  const gate = await requireRole(["expert"]);
  if (gate.response) return gate.response;

  try {
    const { data, error } = await (worker as any)
      .from("order_assignments")
      .select("id, order_id, status, assigned_at, accepted_at, completed_at, orders(order_id, website_name, website_address, order_date)")
      .eq("expert_id", gate.userId)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (error) throw new Error(error.message);

    const orders = (data ?? []).map((row: any) => ({
      assignmentId: row.id,
      orderId: row.order_id,
      websiteName: row.orders?.website_name ?? null,
      websiteAddress: row.orders?.website_address ?? null,
      orderDate: row.orders?.order_date ?? null,
      status: row.status,
      assignedAt: row.assigned_at,
      acceptedAt: row.accepted_at,
      completedAt: row.completed_at,
    }));

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
