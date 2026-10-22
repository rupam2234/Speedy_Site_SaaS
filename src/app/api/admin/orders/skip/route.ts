import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// POST /api/admin/orders/skip  { orderId, skipReason }  (reason mandatory)
export async function POST(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { orderId, skipReason } = await req.json();
    if (!orderId) return NextResponse.json({ message: "orderId required" }, { status: 400 });
    if (!skipReason || typeof skipReason !== "string" || skipReason.trim().length < 3) {
      return NextResponse.json({ message: "skipReason required" }, { status: 400 });
    }

    const { data: current, error: currentError } = await (worker as any)
      .from("order_assignments")
      .select("id")
      .eq("order_id", orderId)
      .eq("is_active", true)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) return NextResponse.json({ message: "No active assignment to skip" }, { status: 404 });

    const { error } = await (worker as any)
      .from("order_assignments")
      .update({ is_active: false, status: "skipped", skip_reason: skipReason.trim() })
      .eq("id", current.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Assignment skipped" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
