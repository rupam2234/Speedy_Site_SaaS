import { NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { OrderData } from "../../dataTypes";
import { auth } from "@clerk/nextjs/server";

const worker = setupDB();

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized: No user ID found" },
        { status: 401 }
      );
    } else {
      const { data: orderData } = await worker
        .from("orders")
        .select("*")
        .eq("user_id", userId);

      if (orderData && orderData.length > 0) {
        const typeOrderData: OrderData[] = orderData.map((order: any) => ({
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
            message: "Order data fetched successfully",
            data: typeOrderData, // Return the fetched rows
          },
          { status: 200 }
        );
      } else {
        const typeOrderData: OrderData[] = [];

        return NextResponse.json(
          {
            message: "No orders found for this email",
            data: typeOrderData,
          },
          { status: 200 }
        );
      }
    }
  } catch (error) {
    console.log("Unable to fetch website data: ", error);
  }
}
