import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125073117_evidence_first_issue_documents.sql",
  ),
  "utf8",
);
const detectorFixMigration = fs.readFileSync(
  path.join(
    root,
    "supabase",
    "migrations",
    "20261125073118_fix_lcp_detector_variable_conflicts.sql",
  ),
  "utf8",
);
const siteAccess = fs.readFileSync(
  path.join(root, "src", "lib", "rum", "siteAccess.ts"),
  "utf8",
);
const issueListRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "rum", "issues", "route.ts"),
  "utf8",
);
const issueDetailRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "rum", "issues", "[issueId]", "route.ts"),
  "utf8",
);
const detectRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "rum", "issues", "detect", "route.ts"),
  "utf8",
);
const assistantRoute = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "api",
    "rum",
    "issues",
    "[issueId]",
    "assistant",
    "route.ts",
  ),
  "utf8",
);
const issueAssistant = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "(dashboard)",
    "dashboard",
    "rum",
    "web-vitals",
    "helpers",
    "issueAssistant.tsx",
  ),
  "utf8",
);
const knowledgeWorker = fs.readFileSync(
  path.join(root, "cloudflare-workers", "issue-knowledge", "src", "index.js"),
  "utf8",
);
const siteContext = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "(dashboard)",
    "dashboard",
    "siteContext.tsx",
  ),
  "utf8",
);

const rumRoutes = [
  "distributions/route.ts",
  "elements/cls/route.ts",
  "elements/fcp/route.ts",
  "elements/inp/route.ts",
  "elements/lcp/route.ts",
  "elements/ttfb/route.ts",
  "fonts/analysis/route.ts",
  "history/route.ts",
  "lcp-images/route.ts",
  "page_performance/route.ts",
  "rum-web-vitals/route.ts",
  "rum-web-vitals/group-by-connection/route.ts",
  "rum-web-vitals/group-by-page/route.ts",
  "usage/route.ts",
].map((relativePath) =>
  fs.readFileSync(
    path.join(root, "src", "app", "api", "rum", ...relativePath.split("/")),
    "utf8",
  ),
);

const analysisRoutes = ["lcp", "cls", "inp"].map((metric) =>
  fs.readFileSync(
    path.join(root, "src", "app", "api", "analysis", metric, "contributors", "route.ts"),
    "utf8",
  ),
);

describe("evidence-first RUM issue workflow", () => {
  it("defines tenant-scoped issue, evidence, backend-test, and history tables", () => {
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.rum_issue_documents/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.rum_issue_evidence/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.wp_backend_tests/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.rum_issue_history/);
    assert.match(migration, /tenant_id uuid NOT NULL REFERENCES auth\.users\(id\)/);
    assert.match(migration, /site_id uuid NOT NULL REFERENCES public\.orders\(order_id\)/);
    assert.match(migration, /UNIQUE \(site_id, fingerprint\)/);
  });

  it("keeps issue reads tenant-scoped and detector execution service-role-only", () => {
    assert.match(migration, /ALTER TABLE public\.rum_issue_documents ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /tenant_id = auth\.uid\(\)/);
    assert.match(migration, /oa\.expert_id = auth\.uid\(\) AND oa\.is_active/);
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.detect_lcp_issues_v1\(uuid, timestamptz, timestamptz, boolean\) FROM PUBLIC/,
    );
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.detect_lcp_issues_v1\(uuid, timestamptz, timestamptz, boolean\) TO service_role/,
    );
  });

  it("uses recurring thresholds, stable fingerprints, and idempotent issue upserts", () => {
    assert.match(migration, /HAVING count\(\*\) >= 5/);
    assert.match(migration, /count\(DISTINCT session_id\) >= 3/);
    assert.match(migration, /encode\(digest\(concat_ws\('\|'/);
    assert.match(migration, /ON CONFLICT \(site_id, fingerprint\) DO UPDATE SET/);
    assert.match(migration, /\(array_agg\(id ORDER BY created_at DESC\)\)\[1:50\]/);
    assert.match(migration, /is_published = public\.rum_issue_documents\.is_published OR EXCLUDED\.is_published/);
    assert.match(migration, /p_publish boolean DEFAULT false/);
    assert.match(detectorFixMigration, /#variable_conflict use_variable/);
    assert.match(detectorFixMigration, /CREATE OR REPLACE FUNCTION public\.detect_lcp_issues_v1/);
  });

  it("authorizes issue APIs by canonical site and server-resolved ownership", () => {
    assert.match(siteAccess, /authorizeRumSite/);
    assert.match(siteAccess, /site\.user_id === user\.id/);
    assert.match(siteAccess, /role === "admin"/);
    assert.match(siteAccess, /\.eq\("expert_id", user\.id\)/);
    assert.match(issueListRoute, /authorizeRumSite\(siteId\)/);
    assert.match(issueListRoute, /\.eq\("site_id", access\.site\.siteId\)/);
    assert.match(issueListRoute, /\.eq\("is_published", true\)/);
    assert.match(issueDetailRoute, /\.eq\("id", issueId\)/);
    assert.match(issueDetailRoute, /\.eq\("site_id", access\.site\.siteId\)/);
    assert.match(detectRoute, /access\.site\.role !== "admin"/);
    assert.match(detectRoute, /MAX_REQUESTS_PER_WINDOW = 10/);
  });

  it("secures existing RUM readers against cross-tenant domain queries", () => {
    for (const route of rumRoutes) {
      assert.match(route, /authorizeRumDomain/);
      assert.match(route, /access\.site\.domainName/);
    }
  });

  it("keeps user issue assistance grounded and tenant-scoped", () => {
    assert.match(assistantRoute, /authorizeRumSite\(siteId\)/);
    assert.match(assistantRoute, /\.eq\("is_published", true\)/);
    assert.match(assistantRoute, /\.eq\("site_id", access\.site\.siteId\)/);
    assert.match(assistantRoute, /hasLiveRumEntitlement/);
    assert.match(assistantRoute, /ISSUE_KNOWLEDGE_WORKER_URL/);
    assert.match(assistantRoute, /AUTHORITATIVE ISSUE FACTS/);
    assert.match(assistantRoute, /untrusted background/);
    assert.match(issueAssistant, /Ask about this issue/);
    assert.match(issueAssistant, /\/api\/rum\/issues\/\$\{issueId\}\/assistant/);
    assert.match(knowledgeWorker, /namespace: body\.tenantId/);
    assert.match(knowledgeWorker, /filter: \{ siteId: body\.siteId \}/);
    assert.match(knowledgeWorker, /CURATED_NAMESPACE/);
    assert.match(knowledgeWorker, /@cf\/baai\/bge-small-en-v1\.5/);
  });

  it("retires browser-selected contributor AI analysis", () => {
    for (const route of analysisRoutes) {
      assert.match(route, /getSupabaseServerUser/);
      assert.match(route, /status: 401/);
      assert.match(route, /status: 410/);
      assert.doesNotMatch(route, /openrouter\.ai/);
      assert.doesNotMatch(route, /await req\.json\(\)/);
    }
    assert.match(siteContext, /selectedSiteId/);
  });
});
