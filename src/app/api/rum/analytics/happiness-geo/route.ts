import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const supabase = setupDB();

interface Props {
  domain: string;
  start_date: string;
  end_date: string;
}

export async function POST(req: NextRequest) {

  const {domain, end_date,start_date}: Props = await req.json();

  if(!domain || !end_date || !start_date){
    return NextResponse.json({message: "Bad request"}, {status: 400});
  }

  try {
    const { data, error } = await supabase.rpc("user_happiness_dist", {
      domain_filter: domain,
      start_date: start_date,
      end_date: end_date,
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
