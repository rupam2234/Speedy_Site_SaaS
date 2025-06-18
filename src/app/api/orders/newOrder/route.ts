import { setupDB } from "@/lib/db";
import { OrderData } from "../../dataTypes";
import { NextResponse } from "next/server";
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
        website_name: body.websiteName,
        website_address: body.websiteAddress,
        favicon_file: body.favicon_file,
        order_status: body.order_status,
        user_email: body.user_email,
        cruxData: body.cruxData,
        dailyMonitoring: body.dailyMonitoring,
        performanceWarning: body.performanceWarning,
        allowSpeedySite: body.allowSpeedySite,
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
        { status: 201 }
      );
    }
  } catch (error) {
    console.log(
      "An unexpected error occurred while inserting website data: ",
      error
    );
  }
}
