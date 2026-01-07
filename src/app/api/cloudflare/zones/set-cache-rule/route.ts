import { CacheRuleUpdated } from "@/app/api/emails/cloudflareRules";
import { setupDB } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/serverSupabase";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  rule_id: string;
  rule_desc: string;
  site: string;
  edgeTTL: number;
  excludedPaths: string;
  cacheByDevice: boolean;
}

const worker = setupDB();

export async function POST(req: NextRequest) {
  const {
    rule_id,
    rule_desc,
    site,
    edgeTTL,
    excludedPaths,
    cacheByDevice,
  }: Props = await req.json();
  const user = await getServerSupabase();

  if (!site) {
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

  // first exclude the rules we don't want to edit
  const rulesToNotEdit = existingRules.filter((x: any) => x.id !== rule_id);

  // prepare excluded path params
  const pathsArray = excludedPaths.split("\n");
  const exclusionExpression = `(http.request.method eq "GET") and (${pathsArray
    .map((path) => `not http.request.uri.path contains "${path.trim()}"`)
    .join(" and ")})`;

  const newRules = {
    id: rule_id,
    action: "set_cache_settings",
    action_parameters: {
      cache: true,
      edge_ttl: { mode: "override_origin", default: edgeTTL * 60 * 60 },
      browser_ttl: { mode: "respect_origin" },
      origin_error_page_passthru: false,
      serve_stale: { disable_stale_while_updating: false },
      cache_key: {
        ignore_query_strings_order: true,
        cache_deception_armor: true,
        cache_by_device_type: cacheByDevice,
      },
    },
    description: "Cache HTML pages",
    enabled: true,
    expression: exclusionExpression,
  };

  if (existingRules.length !== 0) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ZoneData?.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rules: [...rulesToNotEdit, newRules],
        }),
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Unable to update cache rule" },
        { status: 500 },
      );
    }

    // if order_id is not available return
    if (!ZoneData?.order_id) {
      return NextResponse.json(
        {
          message: "Missing ZoneData.order_id, cannot update config_backup",
        },
        { status: 500 },
      );
    }

    const { error: StoreConfigError } = await worker
      .from("cloudflare_auth")
      .update({ config_backup: pathsArray })
      .eq("site_id", ZoneData.order_id);

    if (StoreConfigError) {
      return NextResponse.json(
        {
          message: "Unable to save HTML cache configs",
        },
        { status: 500 },
      );
    }

    // send a cache rule update email to user
    CacheRuleUpdated({
      site: site,
      ruleName: rule_desc,
      userEmail: user.user?.email ? user.user.email : "",
      userName: user.user?.user_metadata.name.split(" ")[0],
    });

    return NextResponse.json(
      { message: "Cache rule updated" },
      { status: 200 },
    );
  } else {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ZoneData?.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rules: [...rulesToNotEdit, newRules],
        }),
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Unable to create cache rule" },
        { status: 500 },
      );
    }

    // send a cache rule created email to user

    return NextResponse.json(
      { message: "Cache rule created" },
      { status: 200 },
    );
  }
}
