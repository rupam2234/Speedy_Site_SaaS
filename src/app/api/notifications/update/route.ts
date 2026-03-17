import { GetServerSupabase, setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  ids: string[];
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { user } = await GetServerSupabase();

  if (!user?.id) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  const { ids }: Props = await req.json();

  if (!ids) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try {
    const { error } = await worker
      .from("notifications")
      .update({ read: true })
      .in("id", ids);

    if (error) {
      throw new Error(error.message ?? "Failed to update notifications");
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted error" },
      { status: 500 },
    );
  }
}
