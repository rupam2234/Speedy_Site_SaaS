import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  hashQuestion,
  normalizeQuestion,
} from "../src/lib/rum/assistantCache.ts";

const root = path.resolve(import.meta.dirname, "..");
const assistantRoute = fs.readFileSync(
  path.join(root, "src", "app", "api", "rum", "assistant", "route.ts"),
  "utf8",
);
const assistantContext = fs.readFileSync(
  path.join(root, "src", "lib", "rum", "assistantContext.ts"),
  "utf8",
);
const assistantCache = fs.readFileSync(
  path.join(root, "src", "lib", "rum", "assistantCache.ts"),
  "utf8",
);
const entitlement = fs.readFileSync(
  path.join(root, "src", "lib", "rum", "entitlement.ts"),
  "utf8",
);
const deviceReader = fs.readFileSync(
  path.join(root, "src", "lib", "rum", "deviceIssueReader.ts"),
  "utf8",
);
const assistantPage = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "(dashboard)",
    "dashboard",
    "rum",
    "assistant",
    "helpers",
    "main.tsx",
  ),
  "utf8",
);
const sidebar = fs.readFileSync(
  path.join(root, "src", "components", "sidebarDesign", "AppSidebar.tsx"),
  "utf8",
);
const webVitalsMain = fs.readFileSync(
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
const knowledgeWorker = fs.readFileSync(
  path.join(root, "cloudflare-workers", "issue-knowledge", "src", "index.js"),
  "utf8",
);

describe("site-wide RAG performance assistant", () => {
  it("authorizes the site and gates the assistant on a live entitlement", () => {
    assert.match(assistantRoute, /authorizeRumSite\(siteId\)/);
    assert.match(assistantRoute, /hasLiveRumEntitlement/);
    assert.match(entitlement, /service_type/);
    assert.match(entitlement, /managed_wp/);
    assert.match(entitlement, /status/);
    assert.match(entitlement, /active/);
    assert.match(entitlement, /expires_at/);
    assert.match(assistantRoute, /"entitlement_required"/);
  });

  it("keeps performance facts server derived", () => {
    assert.match(assistantContext, /from\("rum_issue_documents"\)/);
    assert.match(assistantContext, /\.eq\("is_published", true\)/);
    assert.match(assistantContext, /\.eq\("site_id", siteId\)/);
    assert.match(assistantContext, /readDeviceIssueGroups\(domainName\)/);
    assert.match(assistantRoute, /buildAuthoritativeFacts/);
    assert.doesNotMatch(assistantRoute, /requestBody\.metric/);
    assert.doesNotMatch(assistantRoute, /requestBody\.sample_count/);
  });

  it("caches the answer and the retrieval result and bounds the question rate", () => {
    assert.match(assistantRoute, /getCachedJson<AssistantAnswer>/);
    assert.match(assistantRoute, /setCachedJson\(answerCacheKey/);
    assert.match(assistantRoute, /retrieveKnowledgeCached/);
    assert.match(assistantRoute, /isWithinRateLimit/);
    assert.match(assistantRoute, /SITE_QUESTION_LIMIT_PER_HOUR = 30/);
    assert.match(assistantRoute, /USER_QUESTION_LIMIT_PER_HOUR = 120/);
    assert.match(assistantRoute, /"rate_limited"/);

    assert.match(assistantCache, /export async function getCachedJson/);
    assert.match(assistantCache, /export async function setCachedJson/);
    assert.match(assistantCache, /export async function isWithinRateLimit/);
  });

  it("fails open when the cache or the rate counter is unavailable", () => {
    assert.match(assistantCache, /catch \{\s*return null;/);
    assert.match(assistantCache, /catch \{\s*\/\/ A cache write failure/);
    assert.match(
      assistantCache,
      /Without a working counter the request is allowed rather than blocked/,
    );
  });

  it("normalizes and hashes questions so equivalent asks share a key", () => {
    assert.equal(normalizeQuestion("  What   should I fix FIRST? "), "what should i fix first?");
    assert.equal(
      hashQuestion(normalizeQuestion("What should I fix first?")),
      hashQuestion("what should i fix first?"),
    );
    assert.notEqual(
      hashQuestion(normalizeQuestion("What should I fix first?")),
      hashQuestion("What should I fix second?"),
    );
    assert.equal(hashQuestion("anything").length, 32);
  });

  it("filters citations to the sources that were actually supplied", () => {
    assert.match(assistantRoute, /allowedCitationIds/);
    assert.match(assistantRoute, /allowedCitationIds\.has\(citation\)/);
    assert.match(assistantRoute, /citations/);
    assert.match(assistantRoute, /limitations/);
  });

  it("shares one retained reader between the panels and the assistant", () => {
    assert.match(deviceReader, /analyze_lcp_by_device/);
    assert.match(deviceReader, /cls_elements/);
    assert.match(deviceReader, /inp_elements/);
    assert.match(deviceReader, /ttfb_contributors/);
    assert.match(deviceReader, /analyze_lcp_device_rollup/);
    assert.match(deviceReader, /limitIssuesByMetric/);
    assert.match(assistantContext, /readDeviceIssueGroups/);
  });

  it("labels the device verdict and the element cause apart in the facts", () => {
    assert.match(
      assistantRoute,
      /scope: issue\.summary \? "device" : "element"/,
    );
  });

  it("renders the structured context beside the conversation", () => {
    assert.match(assistantPage, /Performance context/);
    assert.match(assistantPage, /Device breakdown/);
    assert.match(assistantPage, /Performance assistant/);
    assert.match(assistantPage, /\/api\/rum\/assistant/);
    assert.match(assistantPage, /issue_id: focusedIssueId/);
    assert.match(sidebar, /Performance Assistant/);
    assert.match(sidebar, /\/dashboard\/rum\/assistant/);
  });

  it("removes the detected issues surface from the Web Vitals page", () => {
    assert.doesNotMatch(webVitalsMain, /DetectedIssues/);
    assert.doesNotMatch(webVitalsMain, /detectedIssues/);
    assert.match(webVitalsMain, /DeviceIssuePanels domain=\{selectedSite\}/);
    assert.equal(
      fs.existsSync(
        path.join(
          root,
          "src",
          "app",
          "(dashboard)",
          "dashboard",
          "rum",
          "web-vitals",
          "helpers",
          "detectedIssues.tsx",
        ),
      ),
      false,
    );
    assert.equal(
      fs.existsSync(
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
      ),
      false,
    );
    assert.equal(
      fs.existsSync(
        path.join(
          root,
          "src",
          "app",
          "api",
          "rum",
          "issues",
          "[issueId]",
          "assistant",
        ),
      ),
      false,
    );
  });

  it("caches embeddings and retrieval in the Worker and lowers the window", () => {
    assert.match(knowledgeWorker, /RETRIEVAL_TOP_K = 3/);
    assert.match(knowledgeWorker, /embedTextCached/);
    assert.match(knowledgeWorker, /caches\.default\.match/);
    assert.match(knowledgeWorker, /caches\.default\.put/);
    assert.match(knowledgeWorker, /EMBEDDING_CACHE_TTL_SECONDS/);
    assert.match(knowledgeWorker, /RETRIEVAL_CACHE_TTL_SECONDS/);
    assert.doesNotMatch(knowledgeWorker, /topK: 5/);
  });
});
