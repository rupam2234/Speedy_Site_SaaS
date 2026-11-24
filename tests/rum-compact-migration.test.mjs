import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20261123233125_compact_rum_telemetry.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");
const grantsMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261123234821_secure_rum_upsert_grants.sql"
  ),
  "utf8"
);
const dedupeMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124005400_dedupe_rum_upsert_batch.sql"
  ),
  "utf8"
);
const focusedEvidenceMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124055952_focused_rum_evidence_contract.sql"
  ),
  "utf8"
);
const aggregateReadersMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124060651_canonical_retained_aggregate_readers.sql"
  ),
  "utf8"
);
const lcpReadersMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124062156_canonical_retained_lcp_readers.sql"
  ),
  "utf8"
);
const diagnosticReadersMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124062734_canonical_retained_diagnostic_readers.sql"
  ),
  "utf8"
);
const retiredReadersMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124063444_retire_generic_rum_readers.sql"
  ),
  "utf8"
);
const productionReadersFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124123405_fix_retained_reader_production_errors.sql"
  ),
  "utf8"
);
const remainingReadersFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124125351_fix_remaining_retained_reader_errors.sql"
  ),
  "utf8"
);
const diagnosticEvidenceNullFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124162516_fix_rum_diagnostic_evidence_null_handling.sql"
  ),
  "utf8"
);
const diagnosticEvidenceGeometryFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124163711_fix_rum_diagnostic_evidence_geometry_key_conflict.sql"
  ),
  "utf8"
);
const diagnosticEvidenceTextArrayFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124163958_fix_rum_diagnostic_evidence_text_array_comparison.sql"
  ),
  "utf8"
);
const diagnosticEvidenceSqlValidatorMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261124164732_replace_rum_diagnostic_evidence_validator.sql"
  ),
  "utf8"
);

describe("compact RUM migration contract", () => {
  it("keeps the migration additive and preserves legacy events", () => {
    assert.match(migration, /ADD COLUMN IF NOT EXISTS schema_version smallint/);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS referrer_domain text/);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS diagnostic_evidence jsonb/);
    assert.match(migration, /events = rum_metrics\.events \|\| COALESCE\(EXCLUDED\.events/);
    assert.doesNotMatch(migration, /DROP COLUMN/);
    assert.doesNotMatch(migration, /ALTER COLUMN .* NOT NULL/);
  });

  it("uses the existing partial unique pageview conflict target", () => {
    assert.match(
      migration,
      /ON CONFLICT \(pageview_id\) WHERE pageview_id IS NOT NULL DO UPDATE/
    );
  });

  it("keeps first-party context and allows later metrics to supersede", () => {
    assert.match(
      migration,
      /referrer_domain = COALESCE\(rum_metrics\.referrer_domain, EXCLUDED\.referrer_domain\)/
    );
    assert.match(
      migration,
      /device_type = COALESCE\(rum_metrics\.device_type, EXCLUDED\.device_type\)/
    );
    assert.match(
      migration,
      /inp_ms = COALESCE\(EXCLUDED\.inp_ms, rum_metrics\.inp_ms\)/
    );
  });

  it("bounds evidence to an object of at most 4 KiB", () => {
    assert.match(migration, /jsonb_typeof\(diagnostic_evidence\) = 'object'/);
    assert.match(migration, /octet_length\(diagnostic_evidence::text\) <= 4096/);
  });

  it("restricts RPC execution to service_role", () => {
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) FROM PUBLIC/
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) FROM anon/
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) FROM authenticated/
    );
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) TO service_role/
    );
  });

  it("removes explicit public-role grants in the live hardening migration", () => {
    assert.match(
      grantsMigration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) FROM PUBLIC/
    );
    assert.match(
      grantsMigration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) FROM anon/
    );
    assert.match(
      grantsMigration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) FROM authenticated/
    );
    assert.match(
      grantsMigration,
      /GRANT EXECUTE ON FUNCTION public\.upsert_rum_metrics_batch\(jsonb\) TO service_role/
    );
  });

  it("upserts duplicate pageviews in a batch as separate statements", () => {
    assert.match(
      dedupeMigration,
      /RENAME TO upsert_rum_metrics_batch_single/
    );
    assert.match(
      dedupeMigration,
      /PERFORM public\.upsert_rum_metrics_batch_single\(jsonb_build_array\(payload\)\)/
    );
    assert.match(
      dedupeMigration,
      /REVOKE ALL ON FUNCTION public\.upsert_rum_metrics_batch_single\(jsonb\) FROM PUBLIC/
    );
    assert.match(
      dedupeMigration,
      /GRANT EXECUTE ON FUNCTION public\.upsert_rum_metrics_batch_single\(jsonb\) TO service_role/
    );
  });

  it("validates canonical LCP and CLS evidence fields", () => {
    for (const field of [
      "candidate_ttfb_ms",
      "image_width",
      "image_height",
      "is_lazy",
      "fetch_priority",
      "font",
      "involved_elements",
      "time_ms",
      "load_state",
      "area_delta",
      "distance_moved",
      "dx",
      "dy",
      "previous_rect",
      "current_rect",
    ]) {
      assert.match(focusedEvidenceMigration, new RegExp(field));
    }
    assert.match(focusedEvidenceMigration, /jsonb_array_length\(item -> 'involved_elements'\) > 5/);
    assert.match(focusedEvidenceMigration, /jsonb_array_length\(p_evidence -> 'lcp'\) > 3/);
    assert.match(focusedEvidenceMigration, /jsonb_array_length\(p_evidence -> 'cls_shifts'\) > 3/);
  });

  it("keeps the database evidence bound at 4 KiB", () => {
    assert.match(focusedEvidenceMigration, /octet_length\(p_evidence::text\) > 4096/);
    assert.match(focusedEvidenceMigration, /CHECK \(public\.rum_diagnostic_evidence_is_valid\(diagnostic_evidence\)\)/);
  });

  it("accepts JSON null for optional nested diagnostic evidence", () => {
    assert.match(
      diagnosticEvidenceNullFixMigration,
      /jsonb_typeof\(nested\) <> 'null'/
    );
    assert.match(
      diagnosticEvidenceNullFixMigration,
      /jsonb_typeof\(rect\) <> 'null'/
    );
    assert.doesNotMatch(diagnosticEvidenceNullFixMigration, /DROP COLUMN/);
    assert.doesNotMatch(diagnosticEvidenceNullFixMigration, /DELETE FROM public\.rum_metrics/);
  });

  it("keeps CLS geometry field names as text keys", () => {
    assert.match(
      diagnosticEvidenceGeometryFixMigration,
      /name::text NOT IN \([\s\S]*'dx', 'dy',[\s\S]*\)::text\[\]/
    );
    assert.doesNotMatch(diagnosticEvidenceGeometryFixMigration, /DROP COLUMN/);
    assert.doesNotMatch(diagnosticEvidenceGeometryFixMigration, /DELETE FROM public\.rum_metrics/);
  });

  it("compares CLS evidence keys against an explicit text array", () => {
    assert.match(
      diagnosticEvidenceTextArrayFixMigration,
      /name::text <> ALL \(ARRAY\[[\s\S]*'dx', 'dy',[\s\S]*\]::text\[\]\)/
    );
    assert.doesNotMatch(diagnosticEvidenceTextArrayFixMigration, /DROP COLUMN/);
    assert.doesNotMatch(diagnosticEvidenceTextArrayFixMigration, /DELETE FROM public\.rum_metrics/);
  });

  it("uses explicit aliases in the SQL diagnostic evidence validator", () => {
    assert.match(diagnosticEvidenceSqlValidatorMigration, /LANGUAGE sql/);
    assert.match(diagnosticEvidenceSqlValidatorMigration, /AS lcp_item\(item\)/);
    assert.match(diagnosticEvidenceSqlValidatorMigration, /AS cls_item\(item\)/);
    assert.match(diagnosticEvidenceSqlValidatorMigration, /AS field\(key, value\)/);
    assert.match(diagnosticEvidenceSqlValidatorMigration, /DROP FUNCTION IF EXISTS public\.diagnose_rum_diagnostic_evidence_function/);
    assert.doesNotMatch(diagnosticEvidenceSqlValidatorMigration, /DROP COLUMN/);
    assert.doesNotMatch(diagnosticEvidenceSqlValidatorMigration, /DELETE FROM public\.rum_metrics/);
  });

  it("preserves historical rows while enforcing new evidence writes", () => {
    assert.match(focusedEvidenceMigration, /NOT VALID/);
    assert.doesNotMatch(focusedEvidenceMigration, /DROP COLUMN/);
    assert.doesNotMatch(focusedEvidenceMigration, /DELETE FROM public\.rum_metrics/);
  });

  it("keeps the evidence helper unavailable to public roles", () => {
    assert.match(
      focusedEvidenceMigration,
      /REVOKE ALL ON FUNCTION public\.rum_diagnostic_evidence_is_valid\(jsonb\) FROM PUBLIC/
    );
    assert.match(
      focusedEvidenceMigration,
      /REVOKE ALL ON FUNCTION public\.rum_diagnostic_evidence_is_valid\(jsonb\) FROM anon/
    );
    assert.match(
      focusedEvidenceMigration,
      /REVOKE ALL ON FUNCTION public\.rum_diagnostic_evidence_is_valid\(jsonb\) FROM authenticated/
    );
    assert.match(
      focusedEvidenceMigration,
      /GRANT EXECUTE ON FUNCTION public\.rum_diagnostic_evidence_is_valid\(jsonb\) TO service_role/
    );
  });

  it("migrates all retained aggregate and filter readers", () => {
    for (const functionName of [
      "rum_metric_readings",
      "cwv_dist_by_connection",
      "get_web_vital_counts_by_url",
      "analyze_fcp_by_device",
      "get_rum_web_vitals_metrics",
    ]) {
      assert.match(aggregateReadersMigration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`));
    }
    assert.match(aggregateReadersMigration, /CREATE OR REPLACE FUNCTION public\.get_web_vital_counts_by_url\(\s*p_domain text,\s*p_metric text,\s*p_limit integer DEFAULT 15/s);
    assert.match(aggregateReadersMigration, /CREATE OR REPLACE FUNCTION public\.get_web_vital_counts_by_url\(\s*p_domain text,\s*p_metric text,\s*p_device_type text DEFAULT NULL/s);
  });

  it("separates canonical v2 typed reads from historical event fallback", () => {
    const helper = aggregateReadersMigration.slice(
      aggregateReadersMigration.indexOf("CREATE OR REPLACE FUNCTION public.rum_metric_readings"),
      aggregateReadersMigration.indexOf("CREATE OR REPLACE FUNCTION public.cwv_dist_by_connection")
    );
    const v2Branch = helper.slice(0, helper.indexOf("UNION ALL"));
    const legacyBranch = helper.slice(helper.indexOf("UNION ALL"));
    assert.match(v2Branch, /rm\.schema_version >= 2/);
    assert.match(v2Branch, /rm\.fcp_ms/);
    assert.match(v2Branch, /rm\.lcp_ms/);
    assert.doesNotMatch(v2Branch, /rm\.events/);
    assert.match(legacyBranch, /rm\.schema_version IS NULL OR rm\.schema_version < 2/);
    assert.match(legacyBranch, /jsonb_array_elements\(COALESCE\(rm\.events/);
    assert.match(legacyBranch, /SELECT DISTINCT ON \(web_vital->>'name'\)/);
  });

  it("counts canonical pageviews once and keeps null domains unfiltered", () => {
    assert.match(aggregateReadersMigration, /count\(DISTINCT row_id\) AS visits/);
    assert.match(aggregateReadersMigration, /SELECT DISTINCT ON \(row_id\)/);
    assert.match(aggregateReadersMigration, /p_domain IS NULL/);
    assert.match(aggregateReadersMigration, /REPLACE\(COALESCE\(metric\.rating, ''\), '-', ' '\)/);
  });

  it("keeps the normalized metric helper restricted to service_role", () => {
    assert.match(
      aggregateReadersMigration,
      /REVOKE ALL ON FUNCTION public\.rum_metric_readings\(text, timestamptz, timestamptz\) FROM PUBLIC/
    );
    assert.match(
      aggregateReadersMigration,
      /REVOKE ALL ON FUNCTION public\.rum_metric_readings\(text, timestamptz, timestamptz\) FROM anon/
    );
    assert.match(
      aggregateReadersMigration,
      /REVOKE ALL ON FUNCTION public\.rum_metric_readings\(text, timestamptz, timestamptz\) FROM authenticated/
    );
    assert.match(
      aggregateReadersMigration,
      /GRANT EXECUTE ON FUNCTION public\.rum_metric_readings\(text, timestamptz, timestamptz\) TO service_role/
    );
  });

  it("migrates the retained LCP element readers", () => {
    for (const functionName of [
      "rum_lcp_candidates",
      "analyze_lcp_by_device",
      "get_lcp_image_metrics",
      "font_analysis",
    ]) {
      assert.match(lcpReadersMigration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`));
    }
    assert.match(lcpReadersMigration, /rm\.diagnostic_evidence->'lcp'/);
    assert.match(lcpReadersMigration, /candidate_ttfb_ms/);
    assert.match(lcpReadersMigration, /image_width/);
    assert.match(lcpReadersMigration, /image_height/);
    assert.match(lcpReadersMigration, /is_lazy/);
    assert.match(lcpReadersMigration, /fetch_priority/);
    assert.match(lcpReadersMigration, /font_family/);
    assert.match(lcpReadersMigration, /font_transfer_bytes/);
  });

  it("keeps one normalized LCP candidate per pageview", () => {
    const helper = lcpReadersMigration.slice(
      lcpReadersMigration.indexOf("CREATE OR REPLACE FUNCTION public.rum_lcp_candidates"),
      lcpReadersMigration.indexOf("CREATE OR REPLACE FUNCTION public.analyze_lcp_by_device")
    );
    assert.match(helper, /jsonb_to_recordset\(COALESCE\(rm\.diagnostic_evidence->'lcp'/);
    assert.match(helper, /LIMIT 1/);
    assert.match(helper, /rm\.schema_version >= 2/);
    assert.match(helper, /rm\.schema_version IS NULL OR rm\.schema_version < 2/);
  });

  it("preserves retained LCP reader thresholds and response fields", () => {
    assert.match(lcpReadersMigration, /aggregated\.occurrence_count >= 5/);
    assert.match(lcpReadersMigration, /LIMIT 30/);
    assert.match(lcpReadersMigration, /WHERE rank <= 10/);
    assert.match(lcpReadersMigration, /\(array_agg\(current_page ORDER BY frequency DESC\)\)\[1:5\]/);
    assert.match(lcpReadersMigration, /top_3_render_blockers/);
    assert.match(lcpReadersMigration, /pct_exceeding_cwv/);
    assert.match(lcpReadersMigration, /pct_lazy/);
  });

  it("keeps the LCP helper restricted to service_role", () => {
    assert.match(
      lcpReadersMigration,
      /REVOKE ALL ON FUNCTION public\.rum_lcp_candidates\(text, timestamptz, timestamptz\) FROM PUBLIC/
    );
    assert.match(
      lcpReadersMigration,
      /REVOKE ALL ON FUNCTION public\.rum_lcp_candidates\(text, timestamptz, timestamptz\) FROM anon/
    );
    assert.match(
      lcpReadersMigration,
      /REVOKE ALL ON FUNCTION public\.rum_lcp_candidates\(text, timestamptz, timestamptz\) FROM authenticated/
    );
    assert.match(
      lcpReadersMigration,
      /GRANT EXECUTE ON FUNCTION public\.rum_lcp_candidates\(text, timestamptz, timestamptz\) TO service_role/
    );
  });

  it("migrates the remaining retained diagnostic readers", () => {
    for (const functionName of [
      "rum_cls_shifts",
      "rum_inp_interactions",
      "cls_elements",
      "inp_elements",
      "ttfb_contributors",
      "page_performance_analysis",
    ]) {
      assert.match(diagnosticReadersMigration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`));
    }
    assert.match(diagnosticReadersMigration, /rm\.diagnostic_evidence->'cls_shifts'/);
    assert.match(diagnosticReadersMigration, /rm\.diagnostic_evidence->'inp'/);
    assert.match(diagnosticReadersMigration, /rm\.ttfb_ms/);
    assert.match(diagnosticReadersMigration, /rm\.dns_ms/);
    assert.match(diagnosticReadersMigration, /rm\.connect_ms/);
    assert.match(diagnosticReadersMigration, /rm\.backend_response_ms/);
  });

  it("preserves CLS and INP response fields and evidence", () => {
    assert.match(diagnosticReadersMigration, /involved_elems/);
    assert.match(diagnosticReadersMigration, /'areaDelta'/);
    assert.match(diagnosticReadersMigration, /'distanceMoved'/);
    assert.match(diagnosticReadersMigration, /'viewportRatio'/);
    assert.match(diagnosticReadersMigration, /previous_rect/);
    assert.match(diagnosticReadersMigration, /current_rect/);
    assert.match(diagnosticReadersMigration, /responsible_scripts/);
    assert.match(diagnosticReadersMigration, /input_delay/);
    assert.match(diagnosticReadersMigration, /processing_duration/);
    assert.match(diagnosticReadersMigration, /presentation_delay/);
  });

  it("keeps TTFB and page performance thresholds and classifications", () => {
    assert.match(diagnosticReadersMigration, /percentile_cont\(0\.75\).*ttfb_ms.*> 800/s);
    assert.match(diagnosticReadersMigration, /origin_hit_rate/);
    assert.match(diagnosticReadersMigration, /top_country/);
    assert.match(diagnosticReadersMigration, /top_isp/);
    assert.match(diagnosticReadersMigration, /WHERE page_rank <= 20/);
    assert.match(diagnosticReadersMigration, /WHERE element_rank <= 3/);
    assert.match(diagnosticReadersMigration, /THEN 'Good'/);
    assert.match(diagnosticReadersMigration, /THEN 'Poor'/);
    assert.match(diagnosticReadersMigration, /ELSE 'Average'/);
  });

  it("keeps diagnostic helpers restricted to service_role", () => {
    for (const functionName of ["rum_cls_shifts", "rum_inp_interactions"]) {
      assert.match(
        diagnosticReadersMigration,
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${functionName}\\(text\\) FROM PUBLIC`)
      );
      assert.match(
        diagnosticReadersMigration,
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${functionName}\\(text\\) TO service_role`)
      );
    }
  });

  it("keeps production reader corrections conflict-safe and object-only", () => {
    for (const functionName of [
      "analyze_fcp_by_device",
      "get_rum_web_vitals_metrics",
      "analyze_lcp_by_device",
      "get_lcp_image_metrics",
      "cls_elements",
      "ttfb_contributors",
      "page_performance_analysis",
    ]) {
      assert.match(
        productionReadersFixMigration,
        new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`)
      );
    }
    assert.match(productionReadersFixMigration, /#variable_conflict use_column/);
    assert.match(productionReadersFixMigration, /jsonb_typeof\(candidate_doc\) = 'object'/);
    assert.match(productionReadersFixMigration, /jsonb_typeof\(blocker_doc\) = 'object'/);
    assert.match(productionReadersFixMigration, /jsonb_typeof\(web_vital_doc\) = 'object'/);
  });

  it("keeps the final LCP, CLS, and TTFB reader fixes explicit", () => {
    for (const functionName of ["analyze_lcp_by_device", "cls_elements", "ttfb_contributors"]) {
      assert.match(
        remainingReadersFixMigration,
        new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`)
      );
    }
    assert.match(remainingReadersFixMigration, /LANGUAGE sql/);
    assert.match(remainingReadersFixMigration, /WITH lcp_candidates AS/);
    assert.match(remainingReadersFixMigration, /element_groups AS/);
    assert.match(remainingReadersFixMigration, /jsonb_array_elements_text\(shifts\.involved_elements\)/);
    assert.match(remainingReadersFixMigration, /client->'connection'->>'rtt' ~ /);
    assert.match(remainingReadersFixMigration, /client->'connection'->>'downlink' ~ /);
  });

  it("retires only confirmed removal-only readers", () => {
    for (const functionName of [
      "recent_requests",
      "traffic_source",
      "get_daily_web_metrics",
      "user_happiness_dist",
      "ux_map_data",
    ]) {
      assert.match(retiredReadersMigration, new RegExp(`DROP FUNCTION IF EXISTS public\\.${functionName}`));
    }
    assert.doesNotMatch(retiredReadersMigration, /DROP COLUMN/);
    assert.doesNotMatch(retiredReadersMigration, /DELETE FROM/);
    assert.doesNotMatch(retiredReadersMigration, /analyze_lcp_by_device/);
    assert.doesNotMatch(retiredReadersMigration, /cls_elements/);
    assert.doesNotMatch(retiredReadersMigration, /page_performance_analysis/);
  });
});
