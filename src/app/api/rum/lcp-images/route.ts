import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRumDomain } from "@/lib/rum/siteAccess";

const worker = setupDB();

interface Props {
  domain: string;
}

export async function POST(request: NextRequest) {

  const date = new Date();
  const today = date.toISOString().split("T")[0];
  const previousRange = new Date(date)
  previousRange.setDate(date.getDate() - 7)

  const { domain }: Props = await request.json();

  if (!domain) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  const access = await authorizeRumDomain(domain);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: access.message },
      { status: access.status },
    );
  }

  try{
    const {data, error} = await worker.rpc("get_lcp_image_metrics", {
      p_domain_name: access.site.domainName,
      p_start_date: previousRange.toISOString().split("T")[0],
      p_end_date: today
    })

    if(error){
      throw new Error(error.message);
    }

    return NextResponse.json({data}, {status: 200})

  }catch(error:any){
    return NextResponse.json({message: error.message || "Something went wrong fetching LCP images"}, {status: 500})
  }
}
