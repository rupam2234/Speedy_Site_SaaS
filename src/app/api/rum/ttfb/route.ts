import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;
  dateFrom: string;
  dateTo: string;
}

export async function POST(request: NextRequest) {
  const { domain, dateFrom, dateTo }: Props = await request.json();

  if (!domain || !dateFrom || !dateTo) {
    return NextResponse.json(
      {
        message: "bad request",
      },
      { status: 404 },
    );
  }

  try {
    const { data: TTFBdata, error: TTFBerror } = await worker.rpc(
      "ttfb_contributors",
      {
        p_domain: domain,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      },
    );

    if (TTFBerror) {
      return NextResponse.json(
        { message: "Error fetching ttfb contributors" },
        { status: 500 },
      );
    }

    return NextResponse.json({ TTFBdata }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Error fetching TTFB contributors: ",
        error,
      },
      { status: 500 },
    );
  }
}
