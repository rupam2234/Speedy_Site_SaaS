import { userData } from "@/app/api/dataTypes";
import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const helper = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body) {
      return NextResponse.json(
        { message: "Missing user data" },
        { status: 400 }
      );
    }

    const userData: userData = {
      id: body.data?.id,
      email: body.data?.email_addresses?.[0]?.email_address,
      firstname: body.data?.first_name,
      lastname: body.data?.last_name,
    };

    // Check if user already exists by ID or Email
    const { data: existingUsers, error: findError } = await helper
      .from("users")
      .select("*")
      .or(`id.eq.${userData.id},email.eq.${userData.email}`);

    if (findError) {
      return NextResponse.json(
        {
          message: "Error checking user existence",
          details: findError.message,
        },
        { status: 500 }
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { message: "User already exists", user: existingUsers[0] },
        { status: 409 }
      );
    }

    // Insert new user
    const { error: insertError } = await helper.from("users").insert(userData);

    if (insertError) {
      return NextResponse.json(
        { message: "Error creating new user", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User created", success: true },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Invalid request", error: err.message },
      { status: 400 }
    );
  }
}
