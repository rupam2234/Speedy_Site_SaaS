import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { domain, accessToken }: any = await req.json();

  // Validate inputs
  if (!domain || !accessToken) {
    return NextResponse.json(
      { message: "Missing domain or access token" },
      { status: 400 }
    );
  }

  // Determine if domain is a Domain property (sc-domain:) or URL-prefix
  let siteUrl = domain;
  const isDomainProperty = domain.startsWith("sc-domain:");

  if (!isDomainProperty) {
    // Format as URL-prefix (e.g., https://robloxsongcodes.com/)
    if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
      siteUrl = `https://${siteUrl}`;
    }
    if (!siteUrl.endsWith("/")) {
      siteUrl += "/";
    }
  }

  // Validate domain format
  const domainRegex = isDomainProperty
    ? /^sc-domain:[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/
    : /^(https?:\/\/)([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/)$/;
  if (!domainRegex.test(siteUrl)) {
    console.log("Domain validation failed for siteUrl:", siteUrl);
    return NextResponse.json(
      { message: `Invalid domain format: ${siteUrl}` },
      { status: 400 }
    );
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Request body
    const body = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["page"],
      rowLimit: 100,
      orderBy: [{ fieldName: "clicks", descending: true }],
    };

    // Make API call
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errorData: any = await res.json();
      const errorMessage =
        errorData.error?.message ||
        `API request failed with status ${res.status}`;
      console.error("API error:", errorMessage);
      throw new Error(errorMessage);
    }

    const data: any = await res.json();

    const pages =
      data.rows?.map((row: any) => ({
        url: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })) || [];

    return NextResponse.json({ pages }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching page addresses:", error.message);
    // Provide guidance for permission errors
    if (error.message.includes("does not have sufficient permission")) {
      return NextResponse.json(
        {
          message: `Permission error: Ensure the account associated with the access token has at least read-only access to '${siteUrl}' in Google Search Console. Check https://search.google.com/search-console/users.`,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
