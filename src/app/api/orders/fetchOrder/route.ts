import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { OrderData } from "../../dataTypes";
import { GetServerSupabase } from "@/lib/db/getUser";

const db = setupDB();

export async function GET() {
  const {user} = await GetServerSupabase();

  if (!user?.id) {
    return NextResponse.json(
      { message: "Unauthorized: No user ID provided" },
      { status: 401 }
    );
  }

  try {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      throw new Error(error.message || "failed to fetch orders")
    }

    const orders: OrderData[] = (data || []).map((order: OrderData) => ({
      website_name: order.website_name,
      website_address: order.website_address,
      favicon_file: order.favicon_file,
      order_status: order.order_status,
      order_id: order.order_id,
      order_date: order.order_date,
      usage_by_site: order.usage_by_site,
      rum_connection: order.rum_connection,
      user_id: order.user_id
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
  } catch (err:any) {
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
