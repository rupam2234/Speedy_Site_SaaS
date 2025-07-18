import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { OrderData } from "../../dataTypes";
import { auth } from "@clerk/nextjs/server";
const worker = setupDB();

export async function POST(req: Request) {
  try {
    const { userId, has } = await auth();
    if (!userId || !has({ feature: "add_website" })) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

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
        has_lab_access: body.has_lab_access,
        has_rum_access: body.has_rum_access,
        billing_cycle_start: body.billing_cycle_start,
        billing_cycle_end: body.billing_cycle_end,
        subscription_started_at: body.subscription_started_at,
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
