import { GetServerSupabase, setupDB } from "@/lib/db";
import { NextResponse } from "next/server";

const worker = setupDB();

export async function GET() {
  const { user } = await GetServerSupabase();

  if (!user?.id) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await worker
      .from("notifications")
      .select("id, message, type, link, created_at")
      .eq("user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpected error" },
      { status: 500 },
    );
  }
}
