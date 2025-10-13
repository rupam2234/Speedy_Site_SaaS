import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { OrderData } from "../../dataTypes";

const worker = setupDB();

export async function POST(req: NextRequest) {
  try {
    const { user_id }: any = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { message: "Unauthorized: No user ID provided" },
        { status: 401 }
      );
    }

    const { data: orderData, error } = await worker
      .from("orders")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      return NextResponse.json(
        { message: "Failed to fetch orders", error: error.message },
        { status: 500 }
      );
    }

    const typeOrderData: OrderData[] = (orderData || []).map((order: any) => ({
      orderId: order.order_id,
      orderDate: order.order_date,
      gsc_token: order.gsc_token,
      website_name: order.website_name,
      website_address: order.website_address,
      favicon_file: order.favicon_file,
      order_status: order.order_status,
      user_email: order.user_email,
    }));

    const response = NextResponse.json(
      {
        message: typeOrderData.length
          ? "Order data fetched successfully"
          : "No orders found for this user",
        data: typeOrderData,
      },
      { status: 200 }
    );

    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("Unable to fetch website data: ", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
