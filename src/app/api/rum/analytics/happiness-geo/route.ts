import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const supabase = setupDB();

interface Props {
  domain: string;
}

export async function POST(req: NextRequest) {

  const {domain}: Props = await req.json();

  if(!domain){
    return NextResponse.json({message: "Bad request"}, {status: 400});
  }


  const today = new Date();

  const prev = new Date(today);
  prev.setDate(prev.getDate() - 7)

  const todayStr = today.toISOString().split("T")[0];
  const prevStr = prev.toISOString().split("T")[0];

  try {
    const { data, error } = await supabase.rpc("user_happiness_dist", {
      domain_filter: domain,
      start_date: prevStr,
      end_date: todayStr,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { data },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error || "failed to fetch UX data" },
      { status: 500 }
    );
  }
}
