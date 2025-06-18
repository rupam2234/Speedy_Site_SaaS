import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const worker = setupDB();

  try {
    const body = await req.json();

    const email = body.email;

    if (!email) {
      return NextResponse.json(
        {
          message: "Missing parameter",
        },
        { status: 404 }
      );
    }

    return worker
      .from("early_access")
      .insert({ email })
      .then(({ error }) => {
        if (error) {
          return NextResponse.json(
            { message: "Failed to insert: ", error },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            message: `email inserted into early access`,
          },
          { status: 200 }
        );
      });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}
