import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { OrderData } from "../../dataTypes";
import { auth } from "@clerk/nextjs/server";
import { order_per_plan } from "@/data/perPlan";

const worker = setupDB();

export async function POST(req: Request) {
  try {
    const user = await auth();

    const maxSites = user.has({ plan: "free_users" })
      ? order_per_plan.free_users
      : user.has({ plan: "basic_plan" })
      ? order_per_plan.basic_plan
      : user.has({ plan: "pro" })
      ? order_per_plan.pro
      : 0;

    if (!user.userId) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 }
      );
    }

    const body: OrderData = await req.json();

    if (!body) {
      return NextResponse.json(
        { message: "Invalid website data!" },
        { status: 403 }
      );
    } else {
      const { count, error: countError } = await worker
        .from("orders")
        .select("*", { count: "exact" })
        .eq("user_id", user.userId);

      if (countError) {
        return NextResponse.json(
          { message: "unable to get existing website count" },
          { status: 500 }
        );
      }

      const { data: existingSite, error: siteError } = await worker
        .from("orders")
        .select("*")
        .eq("user_id", user.userId)
        .eq("website_name", body.website_name)
        .maybeSingle();

      if (existingSite) {
        return NextResponse.json(
          { message: "This site is already added: ", siteError },
          { status: 409 }
        );
      }

      if (count !== null && count < maxSites && user?.userId) {
        const { error, status } = await worker.from("orders").insert({
          website_name: body.website_name,
          website_address: body.website_address,
          gsc_token: body.gsc_token,
          favicon_file: body.favicon_file,
          order_status: body.order_status,
          user_email: body.user_email,
          user_id: user.userId,
        });

        const { error: JobQueueError } = await worker.from("crux_jobs").insert({
          user_id: user.userId,
          urls: [],
          domain: body.website_name,
        });

        if (JobQueueError) {
          return NextResponse.json(
            {
              message: "Failed to insert url job queue",
            },
            { status: status }
          );
        }

        // Handle errors
        if (error) {
          return NextResponse.json(
            {
              message: "Failed to insert order data",
              error: error.details,
            },
            { status: status }
          );
        }
        // Successful insertion
        return NextResponse.json(
          {
            message: "Order data inserted successfully",
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: "Max site exceeds your quota" },
          { status: 502 }
        );
      }
    }
  } catch (error) {
    NextResponse.json({ message: "Error: ", error }, { status: 500 });
  }
}
