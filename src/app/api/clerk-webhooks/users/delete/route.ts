import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const helper = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id_to_delete: string = body.data?.id;

    if (!id_to_delete) {
      return NextResponse.json(
        { message: "Missing user id to be removed" },
        { status: 400 }
      );
    }

    const { error } = await helper
      .from("users")
      .delete()
      .eq("id", id_to_delete);

    if (error) {
      return NextResponse.json(
        { message: "Error removing user", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User removed", success: true },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Invalid request", error: err.message },
      { status: 400 }
    );
  }
}
