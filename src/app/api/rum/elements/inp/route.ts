import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  domain_name: string;
}

export async function POST(req: NextRequest) {
  
  const {domain_name}:Props = await req.json();

  if(!domain_name){
    return NextResponse.json({message: "bad request"}, {status: 400});
  }
  
  try {
    const { data, error } = await worker.rpc("analyze_inp_by_device", {
      domain_filter: domain_name,
    });

    if (error) {
      throw new Error(error.message ?? "failed to fetch INP elements")
    }

    return NextResponse.json({data}, {status: 200})

  } catch (err: any) {
    return NextResponse.json(
      { message: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
