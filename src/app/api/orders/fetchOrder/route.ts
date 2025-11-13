import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { OrderData } from "../../dataTypes";

const db = setupDB();

interface FetchOrderBody {
  user_id: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as FetchOrderBody;
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json(
      { message: "Unauthorized: No user ID provided" },
      { status: 401 }
    );
  }

  try {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json(
        { message: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    const orders: OrderData[] = (data || []).map((order: any) => ({
      orderId: order.order_id,
      orderDate: order.order_date,
      gsc_token: order.gsc_token,
      website_name: order.website_name,
      website_address: order.website_address,
      favicon_file: order.favicon_file,
      order_status: order.order_status,
      user_email: order.user_email,
    }));

    return NextResponse.json(
      {
        message: orders.length
          ? "Order data fetched successfully"
          : "No orders found for this user",
        data: orders,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error fetching orders:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
