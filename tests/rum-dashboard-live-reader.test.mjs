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
const retentionSecurityMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125021531_secure_and_batch_rum_retention.sql"
  ),
  "utf8"
);
const indexCleanupMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125022142_drop_bloated_legacy_events_index.sql"
  ),
  "utf8"
);
const cleanupGuardMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125023115_disable_raw_cleanup_until_cold_snapshots.sql"
  ),
  "utf8"
);
const unusedReaderCleanupMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125025407_retire_unused_rum_readers.sql"
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

  it("restricts raw cleanup and batches deletions", () => {
    assert.match(
      retentionSecurityMigration,
      /REVOKE ALL ON FUNCTION public\.delete_old_rum_metrics\(\) FROM PUBLIC/
    );
    assert.match(
      retentionSecurityMigration,
      /REVOKE ALL ON FUNCTION public\.delete_old_rum_metrics\(\) FROM anon/
    );
    assert.match(
      retentionSecurityMigration,
      /REVOKE ALL ON FUNCTION public\.delete_old_rum_metrics\(\) FROM authenticated/
    );
    assert.match(
      retentionSecurityMigration,
      /GRANT EXECUTE ON FUNCTION public\.delete_old_rum_metrics\(\) TO service_role/
    );
    assert.match(retentionSecurityMigration, /LIMIT 5000/);
    assert.match(
      cleanupGuardMigration,
      /Raw RUM cleanup is disabled until verified cold snapshots are available/
    );
    assert.match(
      cleanupGuardMigration,
      /GRANT EXECUTE ON FUNCTION public\.delete_old_rum_metrics\(\) TO service_role/
    );
  });

  it("removes the obsolete bloated legacy events index", () => {
    assert.match(
      indexCleanupMigration,
      /DROP INDEX IF EXISTS public\.idx_rum_resource_summary/
    );
  });

  it("reads distributions from canonical and historical raw facts", () => {
    assert.match(
      unusedReaderCleanupMigration,
      /CREATE OR REPLACE FUNCTION public\.rum_distributions_all_metrics/
    );
    assert.match(
      unusedReaderCleanupMigration,
      /FROM public\.rum_metric_readings\(/
    );
    assert.match(unusedReaderCleanupMigration, /AT TIME ZONE 'UTC'/);
    assert.doesNotMatch(unusedReaderCleanupMigration, /FROM public\.rum_daily_distributions/);
    assert.match(
      unusedReaderCleanupMigration,
      /GRANT EXECUTE ON FUNCTION public\.rum_distributions_all_metrics\(text, date, date\) TO service_role/
    );
  });

  it("drops only confirmed unused legacy RUM readers", () => {
    for (const functionName of [
      "analyze_web_vitals_by_page",
      "cache_analysis",
      "get_ai_citation",
      "get_analytics_by_device_and_country",
      "get_web_vitals_metrics",
      "lcp_attribution_by_device",
      "third_party_domains",
      "top_landing_page",
      "user_happiness",
      "web_vitals",
      "delete_old_rum_hits",
      "refresh_rum_daily_distributions",
    ]) {
      assert.match(
        unusedReaderCleanupMigration,
        new RegExp(`DROP FUNCTION IF EXISTS public\\.${functionName}`)
      );
    }
    assert.doesNotMatch(unusedReaderCleanupMigration, /DROP TABLE/);
    assert.doesNotMatch(unusedReaderCleanupMigration, /DELETE FROM/);
    assert.doesNotMatch(unusedReaderCleanupMigration, /DROP COLUMN/);
  });
});
