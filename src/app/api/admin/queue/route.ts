import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// GET /api/admin/queue -> managed-WP orders with no active assignment
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

    const queue = (orders ?? [])
      .filter((row: any) => !assignedIds.has(row.order_id))
      .map((row: any) => ({
        orderId: row.order_id,
        userId: row.user_id,
        websiteName: row.website_name,
        websiteAddress: row.website_address,
        orderDate: row.order_date,
      }));

    return NextResponse.json({ queue }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
