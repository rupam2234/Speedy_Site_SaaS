import { PageManagementHelper } from "@/app/(dashboard)/dashboard/_pages/helper/helperFunc";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code }: any = await req.json();

  if (!code) {
    return NextResponse.json(
      { message: "Missing authorization code!" },
      { status: 400 }
    );
  }

  try {
    const helper = new PageManagementHelper();
    const token = await helper.getToken(code);

    if (!token || !token.tokens.access_token) {
      throw new Error("Token missing in response");
    }

    // // Fetch sites from Google Search Console
    // const sitesRes = await fetch(
    //   "https://www.googleapis.com/webmasters/v3/sites",
    //   {
    //     headers: {
    //       Authorization: `Bearer ${token.tokens.access_token}`,
    //     },
    //   }
    // );

    // const sitesData = await sitesRes.json();

    // const verifiedSites =
    //   sitesData?.siteEntry
    //     ?.filter(
    //       (entry: any) =>
    //         entry.permissionLevel === "siteOwner" ||
    //         entry.permissionLevel === "siteFullUser" ||
    //         entry.permissionLevel === "siteRestrictedUser"
    //     )
    //     .map((entry: any) => entry.siteUrl) || [];

    return NextResponse.json(
      {
        // sites: verifiedSites,
        accessToken: token.tokens.access_token, // will use this to pull the site urls
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error during OAuth handling:", error);

    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
