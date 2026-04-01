import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";

const db = setupDB();

export async function GET() {
  const { user } = await GetServerSupabase();

  if (!user?.id) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      throw new Error(error.message || "failed to fetch orders");
    }

    return NextResponse.json(
      {
        data,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
