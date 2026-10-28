import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// GET /api/admin/experts  -> pool with live active load
export async function GET() {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { data, error } = await (worker as any)
      .from("experts_pool")
      .select("expert_id, capacity, is_available, rr_position, last_assigned_at");

    if (error) throw new Error(error.message);

    const expertIds = (data ?? []).map((row: any) => row.expert_id).filter(Boolean);
    const { data: profiles } = await (worker as any)
      .from("profiles")
      .select("id, email")
      .in("id", expertIds);

    const emailById: Record<string, string> = {};
    for (const p of profiles ?? []) {
      if (p.id) emailById[p.id] = p.email ?? "";
    }

    const { data: loads, error: loadError } = await (worker as any)
      .from("order_assignments")
      .select("expert_id")
      .eq("is_active", true)
      .in("status", ["pending", "accepted", "in_progress"]);

    if (loadError) throw new Error(loadError.message);

    const loadByExpert: Record<string, number> = {};
    for (const row of loads ?? []) loadByExpert[row.expert_id] = (loadByExpert[row.expert_id] ?? 0) + 1;

    const experts = (data ?? []).map((row: any) => ({
      expertId: row.expert_id,
      email: emailById[row.expert_id] || null,
      capacity: row.capacity,
      isAvailable: row.is_available,
      rrPosition: row.rr_position,
      lastAssignedAt: row.last_assigned_at,
      activeLoad: loadByExpert[row.expert_id] ?? 0,
    }));

    return NextResponse.json({ experts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/experts  { expertId, isAvailable?, capacity? }
export async function PATCH(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { expertId, isAvailable, capacity } = await req.json();
    if (!expertId) return NextResponse.json({ message: "expertId required" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (typeof isAvailable === "boolean") update.is_available = isAvailable;
    if (Number.isInteger(capacity) && capacity > 0) update.capacity = capacity;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    const { error } = await (worker as any).from("experts_pool").update(update).eq("expert_id", expertId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Expert updated" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
