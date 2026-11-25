import { setupDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { authorizeRumDomain } from "@/lib/rum/siteAccess";

const worker = setupDB();

interface Props {
  domain: string;
}

export async function POST(request: NextRequest) {
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

  try {
    const { data, error } = await worker.rpc("page_performance_analysis", {
      p_domain: access.site.domainName,
    });

    if (error) {
      throw Error(error.message);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
