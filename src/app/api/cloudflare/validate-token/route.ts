import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "../..";
import { NextResponse } from "next/server";
import { Resend } from "resend";

interface Props {
  token: string;
  site: string;
}

const worker = setupDB();
const resend = new Resend(process.env.RESEND_API_KEY);
const baseAddress = process.env?.NEXT_PUBLIC_PROD_BASE_URL;

export async function POST(req: Request) {
  const { token, site }: Props = await req.json();
  const user = await getSupabaseServerUser();

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

  // if the cf zone has the site then we can proceed to store the site
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

  // check if previous key exist for the site
  const { data: existing, error: fetchError } = await worker
    .from("cloudflare_auth")
    .select("id")
    .eq("user_id", user.user?.id as unknown as string)
    .eq("site_id", SiteIdData[0].order_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { valid: false, message: "Previous key exists" },
      { status: 409 },
    );
  }

  // if the cf-token is valid we store it in db

  if (existing) {
    const { error } = await worker
      .from("cloudflare_auth")
      .update({
        token,
        status: "connected",
        updated_at: new Date().toISOString(),
        config_backup: "",
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json(
        { valid: false, message: "Failed to validate token" },
        { status: 401 },
      );
    }
  } else {
    const { error } = await worker.from("cloudflare_auth").insert({
      user_id: user.user?.id,
      site_id: SiteIdData[0].order_id,
      token,
      status: "connected",
      updated_at: new Date().toISOString(),
      config_backup: "",
    });

    if (error) {
      return NextResponse.json(
        { valid: false, message: "Failed to validate token" },
        { status: 401 },
      );
    }
  }

  await resend.emails.send({
    to: [user.user?.email ? user.user.email : ""],
    from: "Support <contact@speedy.site>",
    cc: ["thespeedysite@gmail.com"],
    subject: "You have successfully connected Cloudflare with Speedy Site",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: transparent; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Body -->
          <tr>
            <td style="padding: 30px; color: #333333;">
              <h2 style="margin-top: 0; font-size: 22px">Hi ${user?.user?.user_metadata.name.split(" ")[0] || "there"},</h2>
  
              <p style="font-size: 16px; line-height: 1.6;">
                This email confirms that Speedy Site has been successfully connected to Cloudflare via token to enable cache and performance optimizations for ${site}.</p>
              <p style="font-size: 16px; line-height: 1.6;">
                You can find the applicable Cloudflare configurations in the
                <a
                  href="${baseAddress}/dashboard/cloudflare?site=${site}"
                  target="_blank"
                  style="color: #CC6CE7; text-decoration: underline;"
                >
                  Cloudflare Lab</a>.
              </p>

            </td>
          </tr>
  
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; font-size: 12px; color: #888888;">
              <p>© ${new Date().getFullYear()} Speedy Site. All rights reserved.</p>
              <p>
                <a href="${baseAddress}/unsubscribe" style="color: #888888; text-decoration: underline;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>
  
        </table>
      </td>
    </tr>
  </table>`,
  });

  return NextResponse.json({ valid: true, message: "Connection Successful" });
}
