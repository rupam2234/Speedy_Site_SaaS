import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { OrderData } from "../../dataTypes";
const worker = setupDB();

export async function POST(req: Request) {
  try {
    const body: OrderData = await req.json();

    if (!body) {
      return NextResponse.json(
        { message: "Invalid website data!" },
        { status: 404 }
      );
    } else {
      const { error, status } = await worker.from("orders").insert({
        website_name: body.website_name,
        website_address: body.website_address,
        gsc_token: body.gsc_token,
        favicon_file: body.favicon_file,
        order_status: body.order_status,
        user_email: body.user_email,
        rank: body.rank,
        page_tracking: body.page_tracking,
      });

      // Handle errors
      if (error) {
        return NextResponse.json(
          {
            message: "Failed to insert order data",
            error: error.message,
          },
          { status: status || 500 }
        );
      }
      // Successful insertion
      return NextResponse.json(
        {
          message: "Order data inserted successfully",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    NextResponse.json({ message: "Error: ", error }, { status: 500 });
  }
}
