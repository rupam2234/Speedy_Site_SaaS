import { setupDB } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/serverSupabase";
import { NextRequest, NextResponse } from "next/server";

const worker = setupDB();

interface Props {
  site: string;
  rule_id: string;
  isEnabled: boolean;
}

export async function POST(req: NextRequest) {
  const { site, rule_id, isEnabled }: Props = await req.json();
  const user = await getServerSupabase();

  if (!site) {
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

  const toggledRule = { ...filteredRule, enabled: !isEnabled };

  const updateRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ZoneData?.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rules: [toggledRule],
      }),
    },
  );

  if (!updateRes.ok) {
    return NextResponse.json(
      { message: "Failed to patch rule status" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Rule status updated" }, { status: 200 });
}
