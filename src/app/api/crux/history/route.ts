import { CruxData } from "@/data-types/cruxData";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  site: string;
}

const APIkey = process.env.NEXT_PUBLIC_CrUXHistoryAPI;

export async function POST(req: NextRequest) {
  const { site }: Props = await req.json();

  if (!site) return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  if (!APIkey) return NextResponse.json({ message: "CrUX API key is missing" }, { status: 400 });

  const address = `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${APIkey}`;
  const formFactors: string[] = ["DESKTOP", "PHONE", "TABLET"];

  try {
    const responses = await Promise.all(
      formFactors.map((device) =>
        fetch(address, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: `https://${site}`,
            metrics: [
              "largest_contentful_paint",
              "cumulative_layout_shift",
              "interaction_to_next_paint",
              "experimental_time_to_first_byte",
            ],
            formFactor: device,
          }),
        })
      )
    );

    const data: CruxData = await Promise.all(
      responses.map(async (res) => {
        if (!res.ok) throw new Error(`CrUX API request failed with status ${res.status}`);
        return await res.json();
      })
    );

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unknown error" }, { status: 500 });
  }
}
