import { setupDB } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const worker = setupDB();
  const user = await auth();

  if (!user.userId) {
    return NextResponse.json({ message: "User unauthorized" }, { status: 401 });
  }

  if (!req) {
    return NextResponse.json(
      { message: "Bad request: Missing req body" },
      { status: 400 }
    );
  }

  const body = await req.json();

  try {
    const { error, status } = await worker
      .from("orders")
      .delete()
      .eq("website_name", body.domain);

    if (error) {
      return NextResponse.json(
        { message: "unable to delete website", status },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "website deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error in deleting website", error },
      { status: 500 }
    );
  }
}
