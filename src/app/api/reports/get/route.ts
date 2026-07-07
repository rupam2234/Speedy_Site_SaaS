import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  order_id: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { order_id }: Props = await req.json();

  if (!order_id) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }


  try {
    const { data, error } = await worker
      .from("email_reporting")
      .select("report_verbosity, optional_email")
      .eq("order_id", order_id);


    if (error) {
      throw new Error(error.message ?? "Error fetching email report config");
    }

    return NextResponse.json({ data }, { status: 200 });
    // TODO: implement multiple email sending with unique verbosity each
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}
