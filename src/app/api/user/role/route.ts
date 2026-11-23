import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

const worker = setupDB();

// GET /api/user/role -> current user's role from profiles
export async function GET() {
  const { user, error } = await getSupabaseServerUser();
  if (error || !user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  try {
    const { data, error: profileError } = await worker
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    const role = data?.role ?? "user";
    return NextResponse.json({ role });
  } catch (error: any) {
    return NextResponse.json({ role: null, error: error.message }, { status: 500 });
  }
}