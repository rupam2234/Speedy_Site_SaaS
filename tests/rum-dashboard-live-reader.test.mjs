import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const historyMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125015224_migrate_canonical_rum_history_reader.sql"
  ),
  "utf8"
);
const historyKeyFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125015847_fix_canonical_rum_history_metric_keys.sql"
  ),
  "utf8"
);
const siteContext = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "(dashboard)",
    "dashboard",
    "siteContext.tsx"
  ),
  "utf8"
);

describe("live RUM dashboard reader contract", () => {
  it("reads history from canonical and historical metric facts", () => {
    assert.match(historyMigration, /CREATE OR REPLACE FUNCTION public\.get_rum_history/);
    assert.match(historyMigration, /FROM public\.rum_metric_readings\(/);
    assert.match(historyMigration, /p_from::timestamptz/);
    assert.match(historyMigration, /\(p_to \+ 1\)::timestamptz/);
    assert.doesNotMatch(historyMigration, /FROM public\.rum_history_new/);
  });

  it("normalizes canonical metric names to dashboard keys", () => {
    assert.match(historyKeyFixMigration, /lower\(metric\.metric_name\) AS metric_name/);
    assert.match(historyKeyFixMigration, /GROUP BY report_date, metric_name/);
    assert.match(historyKeyFixMigration, /jsonb_object_agg\(metric_name, devices\)/);
  });

  it("preserves the dashboard history response shape", () => {
    assert.match(historyMigration, /jsonb_object_agg\(/);
    assert.match(historyMigration, /'p50', p50/);
    assert.match(historyMigration, /'p75', p75/);
    assert.match(historyMigration, /'p90', p90/);
    assert.match(historyMigration, /'p95', p95/);
    assert.match(historyMigration, /'p99', p99/);
    assert.match(historyMigration, /'samples', samples/);
    assert.match(historyMigration, /'cls', COALESCE|daily_stats\.metrics->'cls'/);
    assert.match(historyMigration, /'fcp', COALESCE|daily_stats\.metrics->'fcp'/);
    assert.match(historyMigration, /'inp', COALESCE|daily_stats\.metrics->'inp'/);
    assert.match(historyMigration, /'lcp', COALESCE|daily_stats\.metrics->'lcp'/);
    assert.match(historyMigration, /'ttfb', COALESCE|daily_stats\.metrics->'ttfb'/);
  });

  it("keeps the history reader restricted to service_role", () => {
    assert.match(
      historyMigration,
      /REVOKE ALL ON FUNCTION public\.get_rum_history\(text, date, date\) FROM PUBLIC/
    );
    assert.match(
      historyMigration,
      /REVOKE ALL ON FUNCTION public\.get_rum_history\(text, date, date\) FROM anon/
    );
    assert.match(
      historyMigration,
      /REVOKE ALL ON FUNCTION public\.get_rum_history\(text, date, date\) FROM authenticated/
    );
    assert.match(
      historyMigration,
      /GRANT EXECUTE ON FUNCTION public\.get_rum_history\(text, date, date\) TO service_role/
    );
  });

  it("prefers a managed URL site over a restored session selection", () => {
    assert.match(siteContext, /if \(siteFromUrl\) \{/);
    assert.match(siteContext, /orderList\.some\(\(o\) => o\.website_name === siteFromUrl\)/);
    assert.match(siteContext, /\? siteFromUrl/);
    assert.match(siteContext, /if \(prev\) return prev/);
  });
});
