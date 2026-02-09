import { CacheRuleDeleted } from "@/app/api/emails/cloudflareRules";
import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  rule_id: string;
  site: string;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const { rule_id, site }: Props = await req.json();
  const user = await GetServerSupabase();

  if (!rule_id) {
    return NextResponse.json({ message: "Bad Request" }, { status: 401 });
  }

  const { error: ZoneError, data: ZoneData } = await worker
    .from("v_cf_zone_per_site")
    .select("token, order_id")
    .eq("website_name", site)
    .eq("user_id", user.user?.id as unknown as string)
    .maybeSingle();

  if (ZoneError) {
    return NextResponse.json(
      { message: "Couldn't get Cf Zones" },
      { status: 404 },
    );
  }

  const zones = await fetch(`https://api.cloudflare.com/client/v4/zones`, {
    headers: {
      Authorization: `Bearer ${ZoneData?.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!zones.ok) {
    return NextResponse.json(
      { message: "Error fetching cloudflare Zones" },
      { status: 500 },
    );
  }

  const zoneData: any = await zones.json();

  // get rulesets
  const rulsets = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
    {
      headers: {
        Authorization: `Bearer ${ZoneData?.token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const rulesetData: any = await rulsets.json();

  if (!rulsets.ok) {
    return NextResponse.json(
      { message: "Failed to fetch rulesets" },
      { status: 500 },
    );
  }

  const existingRules = rulesetData.result.rules || [];

  // we need to delete / skip the rule passed through
  const rulesAfterDelete = existingRules.filter((x: any) => x.id !== rule_id);

  // now patch it on cloudflare rule
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ZoneData?.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rules: rulesAfterDelete,
      }),
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { message: "Unable to delete cache rule" },
      { status: 500 },
    );
  }

  const deletedRule = existingRules.filter((x: any) => x.id === rule_id);
  CacheRuleDeleted({
    ruleName: deletedRule.description,
    site: site,
    userEmail: user.user?.email ? user.user.email : "",
    userName: user.user?.user_metadata.name.split(" ")[0],
  }); // send deleted email to user

  return NextResponse.json(
    { isDeleted: true, message: "Cache rule deleted" },
    { status: 200 },
  );
}
