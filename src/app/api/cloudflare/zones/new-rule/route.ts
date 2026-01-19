import { ImageExtension } from "@/app/(dashboard)/dashboard/cloudflare/imageExtensionSelector";
import { CacheRuleCreated } from "@/app/api/emails/cloudflareRules";
import { setupDB } from "@/lib/db";
import { getServerSupabase } from "@/lib/db/serverSupabase";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  rule_type: "Cache HTML pages" | "Cache Images";
  site: string;
  edgeTTL: number;
  browserTTL?: number;
  excludedPaths?: string;
  excluded_images?: ImageExtension[];
  cacheByDevice?: boolean;
}

export async function POST(req: NextRequest) {
  const {
    rule_type,
    site,
    edgeTTL,
    excludedPaths,
    cacheByDevice,
    excluded_images,
    browserTTL,
  }: Props = await req.json();

  const user = await getServerSupabase();
  const worker = setupDB();

  if (!rule_type || !site || !edgeTTL) {
    return NextResponse.json({ message: "bad request" }, { status: 400 });
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

  if (!zoneData.result?.length) {
    return NextResponse.json(
      { message: "No zones found for token" },
      { status: 404 },
    );
  }

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

  if (existingRules.some((x: any) => x.description === rule_type)) {
    return NextResponse.json(
      { message: "Rule type already exists" },
      { status: 409 },
    );
  }

  // keeping previous rules to merge later
  const rulesToMergeLater = existingRules.filter(
    (x: any) => x.description !== rule_type,
  );

  // prepare rule by type
  let newRule;

  switch (rule_type) {
    case "Cache HTML pages":
      const pathsArray = excludedPaths?.split("\n");
      const exclusionExpression = `(http.request.method in {"GET" "HEAD"}) and (${pathsArray
        ?.map((path) => `not http.request.uri.path contains "${path.trim()}"`)
        .join(" and ")})`;

      newRule = {
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

      break;

    case "Cache Images": {
      newRule = {
        action: "set_cache_settings",
        description: "Cache Images",
        enabled: true,
        // gives ext such as "png" "jpg" "jpeg" "webp" "gif" "svg"
        expression: `(http.request.method eq "GET" and http.request.uri.path.extension in {${excluded_images?.map((x) => `"${x}"`).join(" ")}})`,
        action_parameters: {
          cache: true,
          edge_ttl: { mode: "override_origin", default: edgeTTL * 3600 },
          browser_ttl: {
            mode: "override_origin",
            default: browserTTL ? browserTTL * 3600 : 7 * 24 * 3600, // default is 7 days
          },
          origin_error_page_passthru: false,
          serve_stale: { disable_stale_while_updating: false },
          cache_key: {
            ignore_query_strings_order: true,
            cache_deception_armor: true,
            cache_by_device_type: cacheByDevice ? cacheByDevice : false, // default false
          },
        },
      };
      break;
    }

    default:
      return NextResponse.json(
        { message: "Invalid rule type" },
        { status: 400 },
      );
  }

  // now assign the rule

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneData.result[0].id}/rulesets/phases/http_request_cache_settings/entrypoint`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ZoneData?.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rules: [...rulesToMergeLater, newRule],
      }),
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { message: "Unable to create cache rule", error: res.statusText },
      { status: 500 },
    );
  }

  // send email to user
  CacheRuleCreated({
    ruleName: newRule.description,
    site: site,
    userEmail: user.user?.email ? user.user.email : "",
    userName: user.user?.user_metadata.name.split(" ")[0],
  });

  return NextResponse.json(
    { message: `Cache rule of type ${rule_type} created` },
    { status: 200 },
  );
}
