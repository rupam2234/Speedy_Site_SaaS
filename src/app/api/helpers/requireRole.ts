import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

const worker = setupDB();

export type Role = "user" | "admin" | "expert" | null;

// Server-side role gate for /api/admin/* and /api/expert/* routes.
// Returns { role, userId } on success, or a NextResponse to return directly.
export async function requireRole(allowed: Role[]) {
  const { user, error } = await getSupabaseServerUser();

  if (error || !user) {
    return { role: null as Role, userId: null, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const { data, error: profileError } = await worker.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profileError) {
    return { role: null as Role, userId: null, response: NextResponse.json({ message: profileError.message }, { status: 500 }) };
  }

  const role = (data?.role ?? null) as Role;

  if (!role || !allowed.includes(role)) {
    return { role, userId: user.id, response: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { role, userId: user.id, response: null };
}
