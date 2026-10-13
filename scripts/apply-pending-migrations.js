/* eslint-disable */
/**
 * One-off helper: applies the 2026-10-11 free-tier migrations to the database
 * in .env.local (POSTGRES_URL_NON_POOLING || POSTGRES_URL), then verifies.
 *
 * Deliberately does NOT touch the old 20250101_* files (already applied).
 * Idempotent — safe to re-run. Not recorded in supabase_migrations; when the
 * CLI is linked properly later, run `supabase migration repair` for these
 * timestamps so `supabase migration up` / `db push` doesn't re-apply them.
 */
const { Client } = require("pg");
const { parse } = require("pg-connection-string");
const fs = require("fs");
const path = require("path");

const FILES = [
  "20261011000001_free_service_tier_schema.sql",
  "20261011000002_free_service_tier_backfill.sql",
  "20261011000003_free_service_tier_constraints.sql",
  "20261011000004_free_site_hard_limit.sql",
  "20261011000005_rum_metrics_pageview_upsert.sql",
];

function envValue(name) {
  const text = fs.readFileSync(
    path.join(__dirname, "..", ".env.local"),
    "utf8"
  );
  const line = text.split("\n").find((l) => l.trim().startsWith(name + "="));
  if (!line) return undefined;
  return line
    .slice(name.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const connectionString =
  envValue("POSTGRES_URL_NON_POOLING") || envValue("POSTGRES_URL");

if (!connectionString) {
  console.error("Missing POSTGRES_URL in .env.local");
  process.exit(1);
}

const config = parse(connectionString);
config.ssl = { rejectUnauthorized: false };

async function main() {
  const client = new Client(config);
  await client.connect();
  // host only — no credentials printed
  console.log("Connected to:", config.host);

  for (const file of FILES) {
    const filePath = path.join(__dirname, "..", "supabase", "migrations", file);
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`\nApplying ${file} ...`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("  OK");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("  FAILED:", err.message);
      await client.end();
      process.exit(1);
    }
  }

  console.log("\n--- Verification ---");
  const checks = [
    [
      "enum values",
      "SELECT unnest(enum_range(NULL::service_type_enum)) AS value",
    ],
    [
      "trigger on_auth_user_created",
      "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created'",
    ],
    [
      "trigger function handle_new_user",
      "SELECT proname FROM pg_proc WHERE proname = 'handle_new_user'",
    ],
    [
      "indexes",
      "SELECT indexname FROM pg_indexes WHERE indexname IN ('uniq_user_services_free_per_user','uniq_orders_free_per_user') ORDER BY indexname",
    ],
    [
      "user_services.website_name nullable",
      "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'user_services' AND column_name = 'website_name'",
    ],
    [
      "free services count",
      "SELECT count(*)::int AS n FROM user_services WHERE service_type = 'free'",
    ],
    [
      "profiles vs auth.users",
      "SELECT (SELECT count(*)::int FROM profiles) AS profiles, (SELECT count(*)::int FROM auth.users) AS auth_users",
    ],
  ];

  for (const [label, sql] of checks) {
    try {
      const res = await client.query(sql);
      console.log(`${label}:`, JSON.stringify(res.rows));
    } catch (e) {
      console.log(`${label}: ERROR ${e.message}`);
    }
  }

  await client.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
