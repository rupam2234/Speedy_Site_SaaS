import { setupDB } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/serverSupabase";
import { NextResponse } from "next/server";

interface Props {
  token: string;
  site: string;
}

const worker = setupDB();

export async function POST(req: Request) {
  const { token, site }: Props = await req.json();
  const user = await getServerSupabase();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const cfRes = await fetch(
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const cfData: any = await cfRes.json();

  if (!cfRes.ok || cfData.success !== true) {
    return NextResponse.json(
      { valid: false, message: "Invalid token" },
      { status: 401 },
    );
  }

  // get the sites from cf zone
  const cfZonesRes = await fetch("https://api.cloudflare.com/client/v4/zones", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const zonesData: any = await cfZonesRes.json();

  if (!cfZonesRes.ok || !zonesData.success) {
    return NextResponse.json(
      { valid: false, message: "Unable to fetch cloudflare zones" },
      { status: 401 },
    );
  }

  const allowedSites = zonesData.result.map((zone: any) => zone.name);

  if (!allowedSites.includes(site)) {
    return NextResponse.json(
      { valid: false, message: "Token not authorized for this site" },
      { status: 403 },
    );
  }

  // if the cf zone has the site the we can proceed to store the site
  // but first get the site_id

  const { data: SiteIdData, error: SiteIdError } = await worker
    .from("orders")
    .select("order_id")
    .eq("website_name", site);

  if (!SiteIdData || SiteIdError) {
    return NextResponse.json(
      { valid: false, message: "Site not found on our database" },
      { status: 401 },
    );
  }

  // if the cf-token is valid we store it in db
  const { error } = await worker.from("cloudflare_auth").upsert({
    user_id: user.user?.id,
    token: token,
    status: "connected",
    updated_at: new Date().toISOString(),
    config_backup: "",
    site_id: SiteIdData[0].order_id,
  });

  if (error) {
    return NextResponse.json(
      { valid: false, message: "Failed to validate token" },
      { status: 401 },
    );
  }

  return NextResponse.json({ valid: true, message: "Connection Successful" });
}
