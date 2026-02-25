import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain: string;
  startDate: string;
  endDate: string;
}

export async function POST(request: NextRequest) {
  const { domain, startDate, endDate }: Props = await request.json();

  if (!domain || !startDate || !endDate) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  try{
    const {data, error} = await worker.rpc("get_lcp_image_metrics", {
      p_domain_name: domain,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if(error){
      throw new Error(error.message);
    }

    return NextResponse.json({
      domain,
      startDate,
      endDate,
      metrics: data,
    }, {status: 200})

  }catch(error:any){
    return NextResponse.json({message: error.message || "Something went wrong fetching LCP images"}, {status: 500})
  }
}
