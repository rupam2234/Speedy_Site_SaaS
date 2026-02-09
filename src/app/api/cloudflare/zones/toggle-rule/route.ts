import { CacheRuleDisabled } from "@/app/api/emails/cloudflareRules";
import { setupDB } from "@/lib/db";
import { GetServerSupabase } from "@/lib/db/getUser";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  site: string;
  rule_id: string;
  isEnabled: boolean;
}

export async function POST(req: NextRequest) {
  const { site, rule_id, isEnabled }: Props = await req.json();
  const user = await GetServerSupabase();

  if (!site || !rule_id) {
    return NextResponse.json({ message: "Bad Request" }, { status: 401 });
  }

  const { error: ZoneError, data: ZoneData } = await worker
    .from("v_cf_zone_per_site")
    .select("token, order_id")
    .eq("website_name", site)
    .eq("user_id", user?.user?.id as unknown as string)
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

  if (!rulsets.ok) {
    return NextResponse.json(
      { message: "Failed to fetch rulesets" },
      { status: 500 },
    );
  }

  const rulesetData: any = await rulsets.json();

  //  filter the rule from available rulesets
  const filteredRule = rulesetData.result.rules.filter(
    (x: any) => x.id === rule_id,
  )[0];

  if (!filteredRule) {
    return NextResponse.json({ message: "Rule not found" }, { status: 404 });
  }

  // then update the rule
  const updatedRules = rulesetData.result.rules.map((rule: any) =>
    rule.id === rule_id ? { ...rule, enabled: !isEnabled } : rule,
  );

  const updateRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ZoneData?.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rules: updatedRules,
      }),
    },
  );

  if (!updateRes.ok) {
    return NextResponse.json(
      { message: "Failed to patch rule status" },
      { status: 500 },
    );
  }

  // send email update to user
  CacheRuleDisabled({
    site: site,
    ruleName: filteredRule.description,
    userEmail: user?.user?.email ? user.user.email : "",
    userName: user.user?.user_metadata.name.split(" ")[0],
    ruleStatus: isEnabled,
  });

  return NextResponse.json({ message: "Rule status updated" }, { status: 200 });
}
