import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerUser, OrderData } from "../..";
import { setupDB } from "@/lib/db";

interface Props {
  data: OrderData;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { data }: Props = await req.json();

  const { user } = await getSupabaseServerUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized user" }, { status: 401 });
  }

  try {
    if (data?.order_id) {
      const { error } = await worker
        .from("orders")
        .update(data)
        .eq("order_id", data.order_id);

      if (error) throw new Error(error.message);

      return NextResponse.json({ message: "order update" }, { status: 200 });
    }

    return NextResponse.json({ message: "Order id missing" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error ?? "Unexpacted error" },
      { status: 500 },
    );
  }
}
