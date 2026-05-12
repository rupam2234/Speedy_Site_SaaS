import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

export type InpElementType = {
  created_at: string;
  current_page: string;
  device: string;
  inp_value: number;
  input_delay: number;
  interaction_type: string;
  processing_duration: number;
  rating: string;
  responsible_scripts: string;
  presentation_delay: number;
  target_element: string;
};

interface Props {
  domain_name: string;
}

export async function POST(req: NextRequest) {
  const { domain_name }: Props = await req.json();

  if (!domain_name) {
    return NextResponse.json({ message: "bad request" }, { status: 400 });
  }

  try {
    const { data, error } = await worker.rpc("inp_elements", {
      p_domain_name: domain_name,
    });

    if (error) {
      throw new Error(error.message ?? "failed to fetch INP elements");
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message ?? "Server error" },
      { status: 500 },
    );
  }
}
