import { NextResponse } from "next/server";
import { userData } from "../../dataTypes";
import { setupDB } from "@/lib/db";

const worker = setupDB();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userData: userData = body;

    if (!userData.email || !userData.firstname || !userData.lastname) {
      return NextResponse.json(
        { message: "Invalid user data. All fields are required." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await worker
      .from("users")
      .select("*")
      .eq("email", userData.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists", isSaved: true },
        { status: 200 }
      );
    }

    // Insert user
    const { error } = await worker.from("users").insert({
      email: userData.email,
      firstname: userData.firstname,
      lastname: userData.lastname,
    });

    if (error) {
      console.error("Supabase Insert Error", { error, userData });
      return NextResponse.json(
        { message: "Failed to save user data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: `User registered.` }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred: ", error },
      { status: 500 }
    );
  }
}
