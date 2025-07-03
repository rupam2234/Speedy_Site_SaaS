import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";

export interface TokenProps {
  token: string;
  userEmail: string;
}

export async function POST(req: NextRequest) {
  const worker = setupDB();

  if (!req) {
    return NextResponse.json(
      {
        message: "Missing request body",
      },
      { status: 400 }
    );
  }

  const body: TokenProps = await req.json();

  if (!body) {
    return NextResponse.json(
      {
        message: "Appropriate body is required (!hint: of type OrderData)",
      },
      { status: 500 }
    );
  }

  try {
    const { error, status } = await worker
      .from("orders")
      .update({ gsc_token: body.token })
      .eq("user_email", body.userEmail);

    if (error) {
      return NextResponse.json(
        { message: "Unable to update gsc token: ", status },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "success! gsc token updated",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}
