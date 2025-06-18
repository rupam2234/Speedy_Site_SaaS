// to fetch all sites in the platform

import { setupDB } from "@/lib/db";
import { NextResponse } from "next/server";

const tempDate = new Date();
tempDate.setDate(tempDate.getDate() - 1);
const yesterday = tempDate.toISOString().split("T")[0]; //gives year-month-day

const worker = setupDB();

export async function GET() {
  try {
    const { data: rankingData, error } = await worker
      .from("metric_data")
      .select(
        `crux_cls_p75, crux_inp_p75, crux_lcp_p75, website_name, performance_score, device_type`
      )
      .eq("created_at", yesterday);

    if (error) {
      return NextResponse.json(
        { message: "Error occurred", error },
        { status: 500 }
      );
    }

    const { data: faviconData, error: faviconError } = await worker
      .from("orders")
      .select("favicon_file, website_name");

    if (faviconError) {
      return NextResponse.json({
        message: "Unable to fetch favicon",
        faviconError,
      });
    }

    const margedData = rankingData.map((x) => {
      const favicon = faviconData.find(
        (f) => f.website_name === x.website_name
      );

      return {
        ...x,
        favicon: favicon?.favicon_file || null,
      };
    });

    if (margedData && margedData.length > 0) {
      return NextResponse.json(
        { message: "data fetched successfully!", margedData },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "No data available!", margedData },
        { status: 204 }
      );
    }
  } catch (error) {
    return NextResponse.json({ message: "Error fetching websites", error });
  }
}
