import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRumDomain } from "@/lib/rum/siteAccess";

interface Props {
  domain: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { domain }: Props = await req.json();

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

  try {
    const { error, data } = await worker.rpc("font_analysis", {
      p_domain: access.site.domainName,
    });

    if (error) {
      throw new Error(error.message ?? "Error fetching font analysis");
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message ?? "Unexpacted Error" },
      { status: 500 },
    );
  }
}
