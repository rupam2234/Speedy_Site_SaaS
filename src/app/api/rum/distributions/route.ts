import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  site: string;
  startDate: string;
  endDate: string;
}

export async function POST(req: NextRequest) {
  const today = new Date();
  const defaultEndDate = today.toISOString().split("T")[0];
  
  const defaultStartDate = new Date(
    today.getTime() - 30 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  const {
    site,
    startDate = defaultStartDate,
    endDate = defaultEndDate,
  }: Props = await req.json();

  if (!site ) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  try{
    const { error, data } = await worker.rpc("rum_distributions_all_metrics", {
      p_domain_name: site,
      p_start: startDate,
      p_end: endDate,
    });

    if(error){
      throw new Error(error.message);
    }

    return NextResponse.json({ data }, { status: 200 });
  }catch(error:any){
    return NextResponse.json({message: error.message ?? "Unexpacted error"}, {status: 500})
  }

}
