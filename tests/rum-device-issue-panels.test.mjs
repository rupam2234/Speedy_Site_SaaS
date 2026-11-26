import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildDeviceIssues,
  detectAssetType,
  issuePageCount,
  limitIssuesByMetric,
  paginateIssues,
  toDeviceKey,
} from "../src/lib/rum/deviceIssues.ts";

const root = path.resolve(import.meta.dirname, "..");
const route = fs.readFileSync(
  path.join(root, "src", "app", "api", "rum", "device-issues", "route.ts"),
  "utf8",
);
const reader = fs.readFileSync(
  path.join(root, "src", "lib", "rum", "deviceIssueReader.ts"),
  "utf8",
);
const panels = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "(dashboard)",
    "dashboard",
    "rum",
    "web-vitals",
    "helpers",
    "deviceIssuePanels.tsx",
  ),
  "utf8",
);
const main = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "(dashboard)",
    "dashboard",
    "rum",
    "web-vitals",
    "helpers",
    "main.tsx",
  ),
  "utf8",
);

const lcpRow = {
  device_type: "Mobile",
  element_target: "div.hero > img",
  page_url: "/home",
  lcp_asset_url: "https://cdn.example.com/hero-banner.jpg",
  font_family: null,
  occurrence_count: 42,
  avg_lcp_value: 3100,
  p75_lcp_value: 4200,
  avg_resource_load_delay: 900,
  avg_resource_load_duration: 600,
  avg_element_render_delay: 100,
  ttfb_ms: 400,
  network_transfer_bytes: 204800,
  memory_usage_bytes: 409600,
};

const clsRow = {
  dev_type: "desktop",
  current_page: "/pricing",
  most_frequent_element: "div.banner.ad-slot",
  occ_count: 9,
  cls_score: 0.18,
  l_mode: "lazy",
};

const inpRow = {
  device: "tablet",
  current_page: "/shop",
  inp_value: 460,
  rating: "poor",
  interaction_type: "click",
  target_element: "button.add-to-cart",
  input_delay: 120,
  processing_duration: 260,
  presentation_delay: 80,
  responsible_scripts: "https://cdn.example.com/vendor/analytics.js",
};

const ttfbRow = {
  device_type: "mobile",
  page_path: "/blog/post",
  occurrence_count: 17,
  p75_ttfb: 1500,
  p75_dns: 40,
  p75_tcp: 90,
  p75_server: 1200,
  origin_hit_rate: 42,
};

/**
 * Real shape of the feedingnature.com desktop data: ten poor pageviews spread
 * over ten different pages, so no (page, element) group reaches the five
 * observation floor of the element reader.
 */
const desktopRollupRow = {
  device_type: "Desktop",
  pageview_count: 16,
  good_count: 3,
  needs_improvement_count: 3,
  poor_count: 10,
  p50_lcp_value: 6265,
  p75_lcp_value: 6278.5,
  distinct_pages: 16,
  distinct_targets: 7,
  poor_pages: 10,
  worst_page: "/the-5-best-window-bird-feeder-reviews-for-2018.htm",
  worst_page_lcp: 8621,
  top_target: "#block-9>p.has-text-align-center.wp-block-paragraph",
  top_target_count: 4,
  top_target_p75: 5935.25,
};

describe("universal device issue panels", () => {
  it("groups issues by device without a metric switch", () => {
    const grouped = buildDeviceIssues({
      lcp: [lcpRow],
      cls: [clsRow],
      inp: [inpRow],
      ttfb: [ttfbRow],
    });

    assert.equal(grouped.mobile.length, 2);
    assert.equal(grouped.desktop.length, 1);
    assert.equal(grouped.tablet.length, 1);

    assert.deepEqual(
      grouped.mobile.map((issue) => issue.metric).sort(),
      ["LCP", "TTFB"],
    );
    assert.equal(grouped.desktop[0].metric, "CLS");
    assert.equal(grouped.tablet[0].metric, "INP");
  });

  it("marks the affected asset and keeps the page reference", () => {
    const grouped = buildDeviceIssues({
      lcp: [lcpRow],
      cls: [clsRow],
      inp: [inpRow],
      ttfb: [ttfbRow],
    });

    const lcpIssue = grouped.mobile.find((issue) => issue.metric === "LCP");
    assert.equal(lcpIssue.asset.type, "image");
    assert.equal(lcpIssue.asset.label, "hero-banner.jpg");
    assert.equal(lcpIssue.asset.url, lcpRow.lcp_asset_url);
    assert.equal(lcpIssue.page, "/home");
    assert.equal(lcpIssue.rating, "poor");
    assert.ok(lcpIssue.fixes.length > 0);

    const clsIssue = grouped.desktop[0];
    assert.equal(clsIssue.asset.type, "element");
    assert.equal(clsIssue.asset.label, "div.banner.ad-slot");

    const inpIssue = grouped.tablet[0];
    assert.equal(inpIssue.asset.type, "script");
    assert.equal(inpIssue.asset.label, "analytics.js");

    const ttfbIssue = grouped.mobile.find((issue) => issue.metric === "TTFB");
    assert.equal(ttfbIssue.asset.type, "page");
    assert.equal(ttfbIssue.page, "/blog/post");
  });

  it("publishes only issues that exceed a Core Web Vitals threshold", () => {
    const grouped = buildDeviceIssues({
      lcp: [{ ...lcpRow, p75_lcp_value: 1800 }],
      cls: [{ ...clsRow, cls_score: 0.04 }],
      inp: [{ ...inpRow, inp_value: 120 }],
      ttfb: [{ ...ttfbRow, p75_ttfb: 420 }],
    });

    assert.equal(grouped.desktop.length, 0);
    assert.equal(grouped.mobile.length, 0);
    assert.equal(grouped.tablet.length, 0);
  });

  it("caps the rows per metric so each panel stays minimal", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...clsRow,
      current_page: `/page-${index}`,
    }));

    const grouped = buildDeviceIssues({ lcp: [], cls: many, inp: [], ttfb: [] });
    const limited = limitIssuesByMetric(grouped.desktop, 6);

    assert.equal(grouped.desktop.length, 12);
    assert.equal(limited.length, 6);
  });

  it("keeps every issue reachable through pagination", () => {
    const many = Array.from({ length: 14 }, (_, index) => ({
      ...clsRow,
      current_page: `/page-${index}`,
      cls_score: 0.2 + index / 100,
    }));

    const grouped = buildDeviceIssues({ lcp: [], cls: many, inp: [], ttfb: [] });
    const issues = grouped.desktop;

    assert.equal(issuePageCount(issues.length), 3);
    assert.equal(paginateIssues(issues, 0).length, 6);
    assert.equal(paginateIssues(issues, 1).length, 6);
    assert.equal(paginateIssues(issues, 2).length, 2);

    const first = paginateIssues(issues, 0);
    const second = paginateIssues(issues, 1);
    const third = paginateIssues(issues, 2);

    assert.deepEqual(
      first.map((issue) => issue.id),
      issues.slice(0, 6).map((issue) => issue.id),
    );
    assert.deepEqual(
      second.map((issue) => issue.id),
      issues.slice(6, 12).map((issue) => issue.id),
    );
    assert.deepEqual(
      third.map((issue) => issue.id),
      issues.slice(12).map((issue) => issue.id),
    );

    const paged = [...first, ...second, ...third];
    assert.equal(paged.length, issues.length);
    assert.deepEqual(
      paged.map((issue) => issue.id),
      issues.map((issue) => issue.id),
    );
  });

  it("clamps pagination to the available pages", () => {
    const issues = Array.from({ length: 7 }, (_, index) => ({
      id: `issue-${index}`,
    }));

    assert.equal(issuePageCount(0), 1);
    assert.equal(issuePageCount(7), 2);
    assert.equal(paginateIssues(issues, -5).length, 6);
    assert.equal(paginateIssues(issues, 99).length, 1);
    assert.equal(paginateIssues(issues, 99)[0].id, "issue-6");
  });

  it("renders previous and next controls when a metric has more than one page", () => {
    assert.match(panels, /ChevronLeft/);
    assert.match(panels, /ChevronRight/);
    assert.match(panels, /group\.pageCount > 1/);
    assert.match(panels, /Previous \$\{group\.metric\} issues/);
    assert.match(panels, /Next \$\{group\.metric\} issues/);
    assert.match(panels, /\{group\.page \+ 1\}\/\{group\.pageCount\}/);
    assert.match(panels, /paginateIssues\(metricIssues, page\)/);
  });

  it("normalizes device labels and asset types", () => {
    assert.equal(toDeviceKey("Mobile"), "mobile");
    assert.equal(toDeviceKey("DESKTOP"), "desktop");
    assert.equal(toDeviceKey("unknown"), null);
    assert.equal(detectAssetType("/fonts/inter.woff2"), "font");
    assert.equal(detectAssetType("/app.js"), "script");
    assert.equal(detectAssetType("/style.css"), "stylesheet");
    assert.equal(detectAssetType(null), "other");
  });

  it("authorizes the device issue reader and keeps one request per site", () => {
    assert.match(route, /authorizeRumDomain\(domain\)/);
    assert.match(route, /access\.site\.domainName/);
    assert.match(route, /readDeviceIssueGroups\(access\.site\.domainName\)/);
    assert.match(route, /status: 500/);

    assert.match(reader, /analyze_lcp_by_device/);
    assert.match(reader, /cls_elements/);
    assert.match(reader, /inp_elements/);
    assert.match(reader, /ttfb_contributors/);
    assert.match(reader, /Promise\.all/);
    assert.match(reader, /limitIssuesByMetric/);
  });

  it("renders desktop, mobile, and tablet panels without metric switching", () => {
    assert.match(panels, /key: "desktop"/);
    assert.match(panels, /key: "mobile"/);
    assert.match(panels, /key: "tablet"/);
    assert.match(panels, /How to fix/);
    assert.match(panels, /View asset/);
    assert.doesNotMatch(panels, /setActiveMetric/);

    assert.match(main, /DeviceIssuePanels domain=\{selectedSite\}/);
    assert.doesNotMatch(main, /LCPelements/);
    assert.doesNotMatch(main, /CLSelements/);
    assert.doesNotMatch(main, /INPelements/);
    assert.doesNotMatch(main, /TTFBelements/);
  });

  it("surfaces a device level LCP verdict when no element group qualifies", () => {
    const grouped = buildDeviceIssues({
      lcp: [],
      cls: [],
      inp: [],
      ttfb: [],
      lcpRollup: [desktopRollupRow],
    });

    assert.equal(grouped.desktop.length, 1);
    const issue = grouped.desktop[0];
    assert.equal(issue.summary, true);
    assert.equal(issue.metric, "LCP");
    assert.equal(issue.device, "desktop");
    assert.equal(issue.rating, "poor");
    assert.equal(issue.valueLabel, "6.28 s");
    assert.equal(issue.page, desktopRollupRow.worst_page);
    assert.equal(issue.asset.type, "element");
    assert.equal(issue.asset.label, desktopRollupRow.top_target);
    assert.match(issue.impact, /10 of 16 pageviews were poor/);
    assert.ok(issue.fixes.length > 0);
  });

  it("keeps the device level verdict ahead of the element rows", () => {
    const grouped = buildDeviceIssues({
      lcp: [{ ...lcpRow, device_type: "Desktop" }],
      cls: [],
      inp: [],
      ttfb: [],
      lcpRollup: [desktopRollupRow],
    });

    assert.equal(grouped.desktop.length, 2);
    assert.equal(grouped.desktop[0].summary, true);
    assert.equal(grouped.desktop[1].summary, undefined);
  });

  it("omits the device level verdict when the device is healthy or too thin", () => {
    const healthy = buildDeviceIssues({
      lcp: [],
      cls: [],
      inp: [],
      ttfb: [],
      lcpRollup: [
        { ...desktopRollupRow, p75_lcp_value: 1800, poor_count: 0 },
        { ...desktopRollupRow, device_type: "Mobile", pageview_count: 3 },
      ],
    });

    assert.equal(healthy.desktop.length, 0);
    assert.equal(healthy.mobile.length, 0);
  });

  it("reads the device rollup next to the element readers", () => {
    assert.match(reader, /analyze_lcp_device_rollup/);
    assert.match(reader, /lcpRollup: rollupRows/);
    assert.match(panels, /issue\.summary/);
    assert.match(panels, /Device wide/);
  });
});
