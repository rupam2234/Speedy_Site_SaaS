export type DeviceKey = "desktop" | "mobile" | "tablet";

export type IssueMetric = "LCP" | "CLS" | "INP" | "TTFB";

export type AssetMarkType =
  | "image"
  | "font"
  | "script"
  | "stylesheet"
  | "element"
  | "page"
  | "other";

export type DeviceIssueAsset = {
  type: AssetMarkType;
  label: string;
  url: string | null;
};

export type DeviceIssueDetail = {
  label: string;
  value: string;
};

export type DeviceIssue = {
  id: string;
  metric: IssueMetric;
  device: DeviceKey;
  title: string;
  page: string | null;
  asset: DeviceIssueAsset | null;
  value: number | null;
  valueLabel: string;
  rating: "good" | "needs-improvement" | "poor";
  impact: string;
  fixes: string[];
  details: DeviceIssueDetail[];
  summary?: boolean;
};

export type LcpIssueRow = {
  device_type: string;
  element_target: string;
  page_url: string;
  lcp_asset_url: string | null;
  font_family: string | null;
  occurrence_count: number;
  avg_lcp_value: number;
  p75_lcp_value: number;
  avg_resource_load_delay: number;
  avg_resource_load_duration: number;
  avg_element_render_delay: number;
  ttfb_ms: number | null;
  network_transfer_bytes: number | null;
  memory_usage_bytes: number | null;
};

export type ClsIssueRow = {
  dev_type: string;
  current_page: string;
  most_frequent_element: string;
  occ_count: number;
  cls_score: number;
  l_mode: string | null;
};

export type InpIssueRow = {
  device: string;
  current_page: string;
  inp_value: number;
  rating: string;
  interaction_type: string;
  target_element: string;
  input_delay: number;
  processing_duration: number;
  presentation_delay: number;
  responsible_scripts: string;
};

export type TtfbIssueRow = {
  device_type: string;
  page_path: string;
  occurrence_count: number;
  p75_ttfb: number;
  p75_dns: number | null;
  p75_tcp: number | null;
  p75_server: number | null;
  origin_hit_rate: number | null;
};

/** Device level LCP totals, used when no single element group repeats. */
export type LcpDeviceRollupRow = {
  device_type: string;
  pageview_count: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  p50_lcp_value: number;
  p75_lcp_value: number;
  distinct_pages: number;
  distinct_targets: number;
  poor_pages: number;
  worst_page: string | null;
  worst_page_lcp: number | null;
  top_target: string | null;
  top_target_count: number | null;
  top_target_p75: number | null;
};

export type DeviceIssueInput = {
  lcp: LcpIssueRow[];
  cls: ClsIssueRow[];
  inp: InpIssueRow[];
  ttfb: TtfbIssueRow[];
  lcpRollup?: LcpDeviceRollupRow[];
};

const DEVICE_KEYS: DeviceKey[] = ["desktop", "mobile", "tablet"];

export const ISSUES_PER_PAGE = 6;

/** Server-side ceiling per metric, five pages worth, so the client can page. */
export const MAX_ISSUES_PER_METRIC = 30;

export function toDeviceKey(
  value: string | null | undefined,
): DeviceKey | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (
    normalized === "desktop" ||
    normalized === "mobile" ||
    normalized === "tablet"
  ) {
    return normalized;
  }
  return null;
}

export function detectAssetType(
  url: string | null | undefined,
): AssetMarkType {
  if (!url) return "other";
  const path = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(path)) return "image";
  if (/\.(woff2?|ttf|otf|eot)$/.test(path)) return "font";
  if (/\.(m?js|cjs)$/.test(path)) return "script";
  if (/\.css$/.test(path)) return "stylesheet";
  return "other";
}

export function assetLabel(url: string | null | undefined): string {
  if (!url) return "";
  const withoutQuery = url.split("?")[0];
  const fileName = withoutQuery.split("/").pop() ?? "";
  if (!fileName) return withoutQuery;
  return fileName.length > 48 ? `${fileName.slice(0, 45)}...` : fileName;
}

export function formatSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${(Number(value) / 1000).toFixed(2)} s`;
}

function kilobytes(value: number | null | undefined): string | null {
  if (!value) return null;
  return `${(Number(value) / 1024).toFixed(0)} KB`;
}

function lcpRating(value: number): DeviceIssue["rating"] {
  if (value > 4000) return "poor";
  if (value > 2500) return "needs-improvement";
  return "good";
}

function inpRating(value: number): DeviceIssue["rating"] {
  if (value > 500) return "poor";
  if (value > 200) return "needs-improvement";
  return "good";
}

function ttfbRating(value: number): DeviceIssue["rating"] {
  if (value > 1800) return "poor";
  if (value > 800) return "needs-improvement";
  return "good";
}

function clsRating(value: number): DeviceIssue["rating"] {
  if (value > 0.25) return "poor";
  if (value > 0.1) return "needs-improvement";
  return "good";
}

function lcpFixes(row: LcpIssueRow): string[] {
  const phases = [
    {
      value: Number(row.avg_resource_load_delay ?? 0),
      fixes: [
        "Preload the LCP asset or move its request earlier in the HTML",
        "Remove lazy loading from the LCP asset and keep fetchpriority=high",
      ],
    },
    {
      value: Number(row.avg_resource_load_duration ?? 0),
      fixes: [
        "Compress and resize the asset, and serve AVIF or WebP",
        "Serve the asset from a CDN with long lived caching",
      ],
    },
    {
      value: Number(row.avg_element_render_delay ?? 0),
      fixes: [
        "Reduce main thread work before the LCP element paints",
        "Avoid client side rendering of the LCP element",
      ],
    },
  ].sort((left, right) => right.value - left.value);

  const fixes = phases[0]?.fixes ?? [];
  const secondary = phases[1]?.fixes?.[0];
  return secondary ? [...fixes, secondary] : fixes;
}

function lcpTitle(assetType: AssetMarkType): string {
  if (assetType === "image") return "Largest Contentful Paint image is slow";
  if (assetType === "font") return "Largest Contentful Paint web font is slow";
  if (assetType === "script") return "Largest Contentful Paint script is slow";
  return "Largest Contentful Paint element is slow";
}

function buildLcpIssues(row: LcpIssueRow): DeviceIssue | null {
  const device = toDeviceKey(row.device_type);
  if (!device) return null;
  if (Number(row.p75_lcp_value) <= 2500) return null;

  const assetUrl = row.lcp_asset_url ?? null;
  const fontFamily = row.font_family?.replace(/['"]/g, "") ?? null;
  const assetType = assetUrl
    ? detectAssetType(assetUrl)
    : fontFamily
      ? "font"
      : "element";

  const asset: DeviceIssueAsset = assetUrl
    ? { type: assetType, label: assetLabel(assetUrl), url: assetUrl }
    : fontFamily
      ? { type: "font", label: fontFamily, url: null }
      : {
          type: "element",
          label: row.element_target ?? "(unknown)",
          url: null,
        };

  const details: DeviceIssueDetail[] = [
    { label: "p75 LCP", value: formatSeconds(row.p75_lcp_value) },
    { label: "Average LCP", value: formatSeconds(row.avg_lcp_value) },
    {
      label: "Load delay",
      value: `${Math.round(row.avg_resource_load_delay ?? 0)} ms`,
    },
    {
      label: "Load duration",
      value: `${Math.round(row.avg_resource_load_duration ?? 0)} ms`,
    },
    {
      label: "Render delay",
      value: `${Math.round(row.avg_element_render_delay ?? 0)} ms`,
    },
  ];

  const transferSize = kilobytes(row.network_transfer_bytes);
  if (transferSize) details.push({ label: "Transfer size", value: transferSize });

  return {
    id: `lcp:${device}:${row.page_url}:${row.element_target}`,
    metric: "LCP",
    device,
    title: lcpTitle(asset.type),
    page: row.page_url ?? null,
    asset,
    value: Number(row.p75_lcp_value),
    valueLabel: formatSeconds(row.p75_lcp_value),
    rating: lcpRating(Number(row.p75_lcp_value)),
    impact: `p75 LCP ${formatSeconds(row.p75_lcp_value)} across ${row.occurrence_count ?? 0} pageviews`,
    fixes: lcpFixes(row),
    details,
  };
}

const DEVICE_LABELS: Record<DeviceKey, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
};

/** Minimum observations before a device level verdict is treated as an issue. */
export const MIN_ROLLUP_OBSERVATIONS = 5;

function rollupFixes(row: LcpDeviceRollupRow): string[] {
  const fixes = [
    "Review the template markup that every slow page shares, such as the header, hero, and footer",
    "Remove render blocking scripts and defer non critical third party code",
    "Enable page caching and reduce server processing time on the slowest routes",
  ];
  if (Number(row.top_target_count ?? 0) >= 2) {
    fixes.unshift(
      `The element "${row.top_target}" is the LCP element on ${row.top_target_count} pageviews, start there`,
    );
  }
  return fixes;
}

/**
 * Builds the device level LCP verdict. The element reader only returns a
 * (page, element) group seen at least five times, so a device can look clean
 * in the panels while most of its pageviews are poor. This row keeps the
 * panel and the distribution chart in agreement.
 */
export function buildLcpDeviceRollupIssue(
  row: LcpDeviceRollupRow,
): DeviceIssue | null {
  const device = toDeviceKey(row.device_type);
  if (!device) return null;

  const observations = Number(row.pageview_count ?? 0);
  const p75 = Number(row.p75_lcp_value ?? 0);
  if (observations < MIN_ROLLUP_OBSERVATIONS || p75 <= 2500) return null;

  const poorCount = Number(row.poor_count ?? 0);
  const poorPages = Number(row.poor_pages ?? 0);
  const distinctPages = Number(row.distinct_pages ?? 0);
  const worstPage = row.worst_page ?? null;
  const topTarget = row.top_target ?? null;
  const topTargetCount = Number(row.top_target_count ?? 0);

  const asset: DeviceIssueAsset =
    topTarget && topTargetCount >= 2
      ? { type: "element", label: topTarget, url: null }
      : worstPage
        ? { type: "page", label: worstPage, url: null }
        : { type: "other", label: "Site wide", url: null };

  const details: DeviceIssueDetail[] = [
    { label: "p75 LCP", value: formatSeconds(p75) },
    { label: "Median LCP", value: formatSeconds(row.p50_lcp_value) },
    { label: "Pageviews", value: String(observations) },
    { label: "Poor pageviews", value: String(poorCount) },
    { label: "Pages affected", value: String(poorPages) },
  ];
  if (worstPage) {
    details.push({
      label: "Slowest page",
      value: `${worstPage} (${formatSeconds(row.worst_page_lcp)})`,
    });
  }
  if (topTarget && topTargetCount >= 2) {
    details.push({
      label: "Most repeated element",
      value: `${topTarget} on ${topTargetCount} pageviews`,
    });
  }

  const spread =
    distinctPages > 1
      ? ` across ${distinctPages} different pages`
      : " on a single page";

  return {
    id: `lcp-rollup:${device}`,
    metric: "LCP",
    device,
    title: `${DEVICE_LABELS[device]} LCP is ${
      p75 > 4000 ? "poor" : "below the target"
    }`,
    page: worstPage,
    asset,
    value: p75,
    valueLabel: formatSeconds(p75),
    rating: lcpRating(p75),
    impact: `p75 LCP ${formatSeconds(p75)}${spread}, ${poorCount} of ${observations} pageviews were poor`,
    fixes: rollupFixes(row),
    details,
    summary: true,
  };
}

function buildClsIssues(row: ClsIssueRow): DeviceIssue | null {
  const device = toDeviceKey(row.dev_type);
  if (!device) return null;
  if (Number(row.cls_score) <= 0.1) return null;

  const selector = row.most_frequent_element || "(unknown)";
  const details: DeviceIssueDetail[] = [
    { label: "CLS score", value: Number(row.cls_score).toFixed(3) },
    { label: "Shifts observed", value: String(row.occ_count ?? 0) },
  ];
  if (row.l_mode) details.push({ label: "Load state", value: row.l_mode });

  return {
    id: `cls:${device}:${row.current_page}:${selector}`,
    metric: "CLS",
    device,
    title: "Layout shift on a page element",
    page: row.current_page ?? null,
    asset: { type: "element", label: selector, url: null },
    value: Number(row.cls_score),
    valueLabel: Number(row.cls_score).toFixed(3),
    rating: clsRating(Number(row.cls_score)),
    impact: `CLS ${Number(row.cls_score).toFixed(3)} across ${row.occ_count ?? 0} shifts`,
    fixes: [
      "Reserve fixed space for the element so it does not move when content loads",
      "Set explicit width and height on images, embeds, and ad slots",
      "Avoid inserting content above existing content during load",
    ],
    details,
  };
}

function buildInpIssues(row: InpIssueRow): DeviceIssue | null {
  const device = toDeviceKey(row.device);
  if (!device) return null;
  if (Number(row.inp_value) <= 200) return null;

  const script = (row.responsible_scripts ?? "").split("\n")[0]?.trim() ?? "";
  const asset: DeviceIssueAsset = script
    ? { type: "script", label: assetLabel(script) || script, url: script }
    : {
        type: "element",
        label: row.target_element || "(unknown)",
        url: null,
      };

  const interaction = (row.interaction_type || "pointer").toLowerCase();
  const details: DeviceIssueDetail[] = [
    { label: "INP", value: `${Math.round(row.inp_value)} ms` },
    { label: "Input delay", value: `${Math.round(row.input_delay ?? 0)} ms` },
    {
      label: "Processing",
      value: `${Math.round(row.processing_duration ?? 0)} ms`,
    },
    {
      label: "Presentation",
      value: `${Math.round(row.presentation_delay ?? 0)} ms`,
    },
  ];

  return {
    id: `inp:${device}:${row.current_page}:${row.target_element}:${interaction}`,
    metric: "INP",
    device,
    title: `Slow ${interaction} interaction`,
    page: row.current_page ?? null,
    asset,
    value: Number(row.inp_value),
    valueLabel: `${Math.round(row.inp_value)} ms`,
    rating: inpRating(Number(row.inp_value)),
    impact: `INP ${Math.round(row.inp_value)} ms on ${interaction} interactions`,
    fixes: [
      "Break up long tasks and move non essential work off the interaction path",
      "Defer or lazy load third party scripts that run during interaction",
      "Keep event handlers short and avoid heavy synchronous DOM work",
    ],
    details,
  };
}

function buildTtfbIssues(row: TtfbIssueRow): DeviceIssue | null {
  const device = toDeviceKey(row.device_type);
  if (!device) return null;
  if (Number(row.p75_ttfb) <= 800) return null;

  const details: DeviceIssueDetail[] = [
    { label: "p75 TTFB", value: formatSeconds(row.p75_ttfb) },
    { label: "Server", value: `${Math.round(row.p75_server ?? 0)} ms` },
    { label: "DNS", value: `${Math.round(row.p75_dns ?? 0)} ms` },
    { label: "Connection", value: `${Math.round(row.p75_tcp ?? 0)} ms` },
  ];
  if (row.origin_hit_rate !== null && row.origin_hit_rate !== undefined) {
    details.push({
      label: "Origin hit rate",
      value: `${Number(row.origin_hit_rate).toFixed(0)}%`,
    });
  }

  return {
    id: `ttfb:${device}:${row.page_path}`,
    metric: "TTFB",
    device,
    title: "Slow server response on a page",
    page: row.page_path ?? null,
    asset: {
      type: "page",
      label: row.page_path || "(unknown page)",
      url: null,
    },
    value: Number(row.p75_ttfb),
    valueLabel: formatSeconds(row.p75_ttfb),
    rating: ttfbRating(Number(row.p75_ttfb)),
    impact: `p75 TTFB ${formatSeconds(row.p75_ttfb)} across ${row.occurrence_count ?? 0} pageviews`,
    fixes: [
      "Enable page caching for this route and serve it from the edge",
      "Reduce server processing time, plugin overhead, and database queries",
      "Remove redirect chains and keep a CDN in front of the origin",
    ],
    details,
  };
}

function sortIssues(issues: DeviceIssue[]): DeviceIssue[] {
  const ratingRank: Record<DeviceIssue["rating"], number> = {
    poor: 0,
    "needs-improvement": 1,
    good: 2,
  };

  return issues.sort((left, right) => {
    if (left.summary !== right.summary) return left.summary ? -1 : 1;
    const ratingDifference = ratingRank[left.rating] - ratingRank[right.rating];
    if (ratingDifference !== 0) return ratingDifference;
    return (right.value ?? 0) - (left.value ?? 0);
  });
}

/**
 * Builds the minimal per device issue list used by the universal issue panels.
 * Only issues that exceed a Core Web Vitals threshold are published, so every
 * row carries an actionable cause and a matching fix.
 */
export function buildDeviceIssues(input: DeviceIssueInput): Record<
  DeviceKey,
  DeviceIssue[]
> {
  const grouped: Record<DeviceKey, DeviceIssue[]> = {
    desktop: [],
    mobile: [],
    tablet: [],
  };

  const push = (issue: DeviceIssue | null) => {
    if (!issue) return;
    grouped[issue.device].push(issue);
  };

  input.lcp.forEach((row) => push(buildLcpIssues(row)));
  input.cls.forEach((row) => push(buildClsIssues(row)));
  input.inp.forEach((row) => push(buildInpIssues(row)));
  input.ttfb.forEach((row) => push(buildTtfbIssues(row)));
  (input.lcpRollup ?? []).forEach((row) => push(buildLcpDeviceRollupIssue(row)));

  DEVICE_KEYS.forEach((device) => {
    grouped[device] = sortIssues(grouped[device]);
  });

  return grouped;
}

export function limitIssuesByMetric(
  issues: DeviceIssue[],
  limit: number = MAX_ISSUES_PER_METRIC,
): DeviceIssue[] {
  const counts: Record<IssueMetric, number> = {
    LCP: 0,
    CLS: 0,
    INP: 0,
    TTFB: 0,
  };

  return issues.filter((issue) => {
    if (counts[issue.metric] >= limit) return false;
    counts[issue.metric] += 1;
    return true;
  });
}

/** Number of pages needed to show every issue of one metric group. */
export function issuePageCount(
  total: number,
  pageSize: number = ISSUES_PER_PAGE,
): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/** Returns the issues visible on one page, clamped to a valid page index. */
export function paginateIssues(
  issues: DeviceIssue[],
  page: number,
  pageSize: number = ISSUES_PER_PAGE,
): DeviceIssue[] {
  const size = Math.max(1, pageSize);
  const pages = issuePageCount(issues.length, size);
  const current = Math.min(Math.max(0, page), pages - 1);
  const start = current * size;
  return issues.slice(start, start + size);
}
