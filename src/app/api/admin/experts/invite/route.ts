import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// POST /api/admin/experts/invite  { email }
// Creates the auth user (Supabase sends the invite email), the profiles row
// (role=expert via trigger) and the experts_pool row.
export async function POST(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { email, capacity } = await req.json();

    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ message: "Valid email required" }, { status: 400 });
    }

    const supabase = worker;

    // create auth user; Supabase emails an invite link automatically
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role: "expert" },
    });

    if (authError) {
      const conflict = authError.message?.toLowerCase().includes("already been registered");
      return NextResponse.json({ message: conflict ? "A user with this email already exists" : authError.message }, { status: conflict ? 409 : 500 });
    }

    const expertId = authData.user!.id;

    // profile row is created by the on_auth_user_created trigger; make sure
    // its role is 'expert' (default trigger inserts role = 'user')
    const { error: roleError } = await supabase.from("profiles").upsert({ id: expertId, email, role: "expert" });
    if (roleError) throw new Error(roleError.message);

    const { error: poolError } = await (supabase as any)
      .from("experts_pool")
      .upsert({
      expert_id: expertId,
      capacity: Number.isInteger(capacity) && capacity > 0 ? capacity : 10,
      is_available: true,
      rr_position: 0,
    });
    if (poolError) throw new Error(poolError.message);

    return NextResponse.json({ message: "Expert invited", expertId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
