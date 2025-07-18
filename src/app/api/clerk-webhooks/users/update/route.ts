import { userData } from "@/app/api/dataTypes";
import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const helper = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userdata: userData = {
      id: body.data?.id,
      email: body.data?.email_addresses?.[0]?.email_address,
      firstname: body.data?.first_name,
      lastname: body.data?.last_name,
    };

    if (!userdata.id) {
      return NextResponse.json({ message: "Missing user id" }, { status: 400 });
    }

    const { data, error } = await helper
      .from("users")
      .upsert(userdata)
      .select();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { message: "Error upserting user", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User upserted", user: data?.[0] },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Request error:", err);
    return NextResponse.json(
      { message: "Invalid request", error: err.message },
      { status: 400 }
    );
  }
}
