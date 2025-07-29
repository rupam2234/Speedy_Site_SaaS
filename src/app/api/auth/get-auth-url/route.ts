import { PageManagementHelper } from "@/app/(dashboard)/dashboard/pages/helper/helperFunc";
import { NextResponse } from "next/server";

export async function GET() {
  const helper = new PageManagementHelper();
  const url = await helper.authenticate();

  if (!url) {
    return NextResponse.json(
      {
        message: "Unable to get auth url",
      },
      { status: 400 }
    );
  }

  return Response.json({ authUrl: url });
}
