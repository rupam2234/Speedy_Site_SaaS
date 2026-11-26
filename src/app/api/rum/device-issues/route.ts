import { NextRequest, NextResponse } from "next/server";
import { authorizeRumDomain } from "@/lib/rum/siteAccess";
import { readDeviceIssueGroups } from "@/lib/rum/deviceIssueReader";

interface Props {
  domain: string;
}

export async function POST(req: NextRequest) {
  const { domain }: Props = await req.json();

  if (!domain) {
    return NextResponse.json(
      { error: "bad_request", message: "A domain is required." },
      { status: 400 },
    );
  }

  const access = await authorizeRumDomain(domain);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, message: access.message },
      { status: access.status },
    );
  }

  try {
    const data = await readDeviceIssueGroups(access.site.domainName);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    console.error("rum device issue query failed", {
      siteId: access.site.siteId,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      {
        error: "device_issue_query_failed",
        message: "Unable to load performance issues for this site.",
      },
      { status: 500 },
    );
  }
}
