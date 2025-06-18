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
        {
          message: "Invalid user data. All fields are required.",
        },
        { status: 400 }
      );
    } else {
      // check if the user exists

      const { data: existingUser } = await worker
        .from("users")
        .select("*")
        .eq("email", userData.email)
        .single();

      // when the user exists

      if (existingUser) {
        return NextResponse.json(
          {
            message: "User already exists",
            isSaved: true,
          },
          { status: 200 }
        );
      }

      // when the user does not exists, add user to DB
      else {
        const { error } = await worker.from("users").insert({
          email: userData.email,
          firstname: userData.firstname,
          lastname: userData.lastname,
          id: userData.id,
        });

        if (error) {
          // for debug perpose
          console.error("Supabase Insert Error", { error, userData });

          return NextResponse.json(
            { message: "Failed to save user data" },
            { status: 500 }
          );
        } else {
          return NextResponse.json(
            { message: "User saved successfully" },
            { status: 200 }
          );
        }
      }
    }
  } catch (error) {
    // for debug
    console.error("Unexpected Error:", error);

    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}
