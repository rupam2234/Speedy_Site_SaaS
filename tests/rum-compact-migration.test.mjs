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
});
