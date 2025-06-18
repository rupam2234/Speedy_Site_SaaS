import { NextResponse } from "next/server";

export type FaviconData = {
  site: string;
  favicon: string | null;
};

async function fetchFaviconFromHTML(siteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(siteUrl, { method: "GET" });
    if (!response.ok) return null;

    const html = await response.text();
    const match = html.match(
      /<link\s+[^>]*rel=["']?(icon|shortcut icon)["']?[^>]*>/i
    );

    if (match) {
      const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        let faviconUrl = hrefMatch[1];

        // Handle relative URLs
        if (!faviconUrl.startsWith("http")) {
          const url = new URL(siteUrl);
          faviconUrl = `${url.origin}${faviconUrl.startsWith("/") ? faviconUrl : "/" + faviconUrl}`;
        }
        return faviconUrl;
      }
    }
  } catch (error) {
    console.error(`Error fetching favicon from HTML: ${siteUrl}`, error);
  }
  return null;
}

async function checkFavicon(siteUrl: string): Promise<string | null> {
  // Try to find favicon in HTML
  const faviconFromHTML = await fetchFaviconFromHTML(siteUrl);
  if (faviconFromHTML) return faviconFromHTML;

  // Fallback options
  const possibleFavicons = [`${siteUrl}/favicon.ico`, `${siteUrl}/icon.ico`];

  for (const url of possibleFavicons) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch (error) {
      console.error(`Error checking ${url}:`, error);
    }
  }

  return null; // Return null instead of a default favicon
}

export async function POST(req: Request) {
  try {
    const websites: { website: string }[] = await req.json();

    if (!websites || !Array.isArray(websites) || websites.length === 0) {
      return NextResponse.json(
        { error: "No valid website data provided" },
        { status: 400 }
      );
    }

    const faviconData: FaviconData[] = await Promise.all(
      websites.map(async ({ website }) => {
        const siteUrl = `https://${website.replace(/(^\w+:|^)\/\//, "")}`;
        const favicon = await checkFavicon(siteUrl);
        return { site: siteUrl, favicon };
      })
    );

    return NextResponse.json({ favicons: faviconData });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
