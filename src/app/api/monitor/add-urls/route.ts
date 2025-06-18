import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export async function POST(req: NextRequest) {
  try {
    const body: string[] = await req.json();

    if (body.length === 0) {
      return NextResponse.json(
        {
          message: "Missing URLs!",
        },
        { status: 404 }
      );
    }

    // find the hostname & how many urls does the host have
    const website_name = new URL(body[0]).hostname;

    let monitoring_page_current: number = 0;

    const { data: orderData } = await worker
      .from("orders")
      .select("*")
      .eq("website_name", website_name);

    if (orderData && orderData.length > 0) {
      monitoring_page_current = orderData[0].page_tracking ?? 0;

      // if urls are > 10 then insert new urls
      if (monitoring_page_current < 11) {
        const possibleUrl = 10 - monitoring_page_current;

        // filtered urls (based on available space under 10)
        const filteredUrls = body.slice(0, possibleUrl);

        // insert new urls by each
        for (let i = 0; i < filteredUrls.length; i++) {
          const { error, status } = await worker
            .from("page_monitoring")
            .insert({ website: website_name, url: filteredUrls[i] });

          if (error) {
            return NextResponse.json(
              {
                message: "Failed to insert urls",
                error: error.message,
              },
              { status: status || 501 }
            );
          }
        }

        // if all new urls are added then update the url number on order_table
        const { error } = await worker
          .from("orders")
          .update({
            page_tracking: monitoring_page_current + filteredUrls.length,
          })
          .eq("website_name", website_name);

        if (error) {
          return NextResponse.json(
            {
              message: "urls added but failed to update url count on order",
              error: error.message,
            },
            { status: 204 }
          );
        }

        // return success to API call
        return NextResponse.json(
          {
            message: "urls for tracking inserted successfully",
          },
          { status: 200 }
        );
      }
    } else {
      return NextResponse.json(
        {
          message: "Url limit reached for this website.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.log("Unable to fetch tracking page number: ", error);

    return NextResponse.json(
      {
        message: "An error occurred while processing your request.",
        error: error,
      },
      { status: 500 }
    );
  }
}
