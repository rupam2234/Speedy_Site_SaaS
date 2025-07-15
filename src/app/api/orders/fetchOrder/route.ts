import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { OrderData } from "../../dataTypes";

const worker = setupDB();

// to fetch websites under certain users or team
export async function POST(req: NextRequest) {
  try {
    const body: string = await req.json();

    const user_email: string = body;

    if (!user_email) {
      return NextResponse.json(
        {
          message: "Invalid user email! Send the user email",
        },
        { status: 400 }
      );
    } else {
      const { data: orderData } = await worker
        .from("orders")
        .select("*")
        .eq("user_email", user_email);

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
          rank: order.rank,
          page_tracking: order.page_tracking,
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
