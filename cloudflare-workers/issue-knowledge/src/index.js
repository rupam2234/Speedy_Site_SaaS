const CURATED_NAMESPACE = "curated-remediation";
const EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
const MAX_QUESTION_LENGTH = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Cost guardrails. Workers AI inference and Vectorize queries are billed per
// call, so embeddings and retrieval results are cached and the result window
// stays small.
const RETRIEVAL_TOP_K = 3;
const EMBEDDING_CACHE_TTL_SECONDS = 60 * 30;
const CURATED_EMBEDDING_CACHE_TTL_SECONDS = 60 * 60 * 24;
const RETRIEVAL_CACHE_TTL_SECONDS = 60 * 15;
const CACHE_ORIGIN = "https://issue-knowledge.internal";

const CURATED_PLAYBOOKS = [
  {
    id: "slow-lcp-image",
    issueType: "slow_lcp_image",
    title: "Slow LCP image remediation",
    body: "For a recurring LCP image, first identify the exact asset in the issue evidence. Check its decoded bytes, dimensions, load delay, load duration, render delay, lazy loading state, and fetch priority. Compress or resize the source image, serve an appropriately sized responsive variant, reserve its dimensions to prevent layout movement, and preload only the image that is confirmed to be the LCP candidate. Do not preload a speculative asset.",
  },
  {
    id: "wp-rocket-image-delivery",
    issueType: "slow_lcp_image",
    title: "WP Rocket image delivery checklist",
    body: "In WP Rocket, review File Optimization, Preload Images, and Delay JavaScript Execution for the confirmed LCP page. Keep the confirmed LCP asset in preload, exclude it from lazy loading, and avoid delaying CSS or scripts required to render that asset. Verify that the image remains the largest contentful paint element after the change.",
  },
  {
    id: "lcp-render-delay",
    issueType: "slow_lcp_image",
    title: "LCP render delay troubleshooting",
    body: "Separate image transfer time from render delay before changing settings. High render delay can indicate that the browser received the image but could not paint it promptly. Check render blocking CSS, server response time, hydration work, and late DOM insertion. Apply the smallest change supported by the issue evidence and remeasure the same template and device cohort.",
  },
  {
    id: "measurement-verification",
    issueType: "verification",
    title: "Performance fix verification",
    body: "Verify a fix on the same page template, metric, device class, and network cohort that was diagnosed. Compare comparable observation windows and record p50, p75, affected pageview rate, sample count, and confidence. A single faster pageview is not proof that the recurring issue is resolved.",
  },
];

function json(data, status = 200) {
  return Response.json(data, { status });
}

function isAuthorized(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  return Boolean(env.ASSISTANT_SECRET) && authorization === `Bearer ${env.ASSISTANT_SECRET}`;
}

function parseRequestBody(request) {
  return request.json().catch(() => null);
}

function isValidScope(body) {
  return (
    body &&
    typeof body.tenantId === "string" &&
    UUID_PATTERN.test(body.tenantId) &&
    typeof body.siteId === "string" &&
    UUID_PATTERN.test(body.siteId) &&
    typeof body.question === "string" &&
    body.question.trim().length >= 3 &&
    body.question.length <= MAX_QUESTION_LENGTH
  );
}

async function embedText(env, text) {
  const result = await env.AI.run(EMBEDDING_MODEL, { text: text.slice(0, 4000) });
  const vector = result?.data?.[0];
  if (!Array.isArray(vector) || vector.length !== 384) {
    throw new Error("Embedding response did not contain a 384 dimension vector.");
  }
  return vector;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function hashKey(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function cacheMatch(key) {
  if (typeof caches === "undefined") return null;
  try {
    const response = await caches.default.match(`${CACHE_ORIGIN}/${key}`);
    if (!response) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function cachePut(key, value, ttlSeconds) {
  if (typeof caches === "undefined") return;
  try {
    await caches.default.put(
      `${CACHE_ORIGIN}/${key}`,
      new Response(JSON.stringify(value), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${ttlSeconds}`,
        },
      }),
    );
  } catch {
    // A cache write failure only costs one extra embedding call next time.
  }
}

/**
 * Embeddings are the billed part of retrieval, so a repeated question reuses
 * the cached vector instead of calling Workers AI again.
 */
async function embedTextCached(env, text, ttlSeconds) {
  const normalized = normalizeText(text);
  const key = `embedding:${await hashKey(normalized)}`;
  const cached = await cacheMatch(key);
  if (cached) return cached;

  const vector = await embedText(env, text);
  await cachePut(key, vector, ttlSeconds);
  return vector;
}

function buildCuratedText(playbook) {
  return `${playbook.title}\nIssue type: ${playbook.issueType}\n${playbook.body}`;
}


async function indexCuratedPlaybooks(env) {
  const vectors = [];
  for (const playbook of CURATED_PLAYBOOKS) {
    vectors.push({
      id: playbook.id,
      namespace: CURATED_NAMESPACE,
      values: await embedTextCached(
        env,
        buildCuratedText(playbook),
        CURATED_EMBEDDING_CACHE_TTL_SECONDS,
      ),
      metadata: {
        kind: "playbook",
        siteId: "all",
        issueType: playbook.issueType,
        title: playbook.title,
        content: playbook.body,
      },
    });
  }
  await env.VECTORIZE.upsert(vectors);
  return vectors.length;
}

function buildIssueText(issue) {
  return [
    issue.title,
    `Issue type: ${issue.issue_type}`,
    `Symptom: ${issue.symptom}`,
    `Cause: ${issue.root_cause}`,
    `Scope: ${JSON.stringify(issue.affected_scope || {})}`,
    `Recommended fix: ${JSON.stringify(issue.recommended_fix || [])}`,
    `Expected impact: ${issue.expected_impact || "Not recorded"}`,
  ].join("\n");
}

async function fetchResolvedIssues(env) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/rum_issue_documents`);
  url.searchParams.set("select", "id,tenant_id,site_id,issue_type,title,symptom,root_cause,affected_scope,recommended_fix,expected_impact,last_seen_at");
  url.searchParams.set("is_published", "eq.true");
  url.searchParams.set("status", "eq.resolved");
  url.searchParams.set("limit", "100");
  const response = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase issue query failed with status ${response.status}.`);
  }
  return response.json();
}

async function indexResolvedIssues(env) {
  const issues = await fetchResolvedIssues(env);
  if (!issues.length) return 0;
  const vectors = [];
  for (const issue of issues) {
    vectors.push({
      id: `resolved-${issue.id}`,
      namespace: issue.tenant_id,
      values: await embedTextCached(
        env,
        buildIssueText(issue),
        EMBEDDING_CACHE_TTL_SECONDS,
      ),
      metadata: {
        kind: "resolved_issue",
        siteId: issue.site_id,
        issueType: issue.issue_type,
        title: issue.title,
        content: buildIssueText(issue).slice(0, 900),
      },
    });
  }
  await env.VECTORIZE.upsert(vectors);
  return vectors.length;
}

async function retrieve(env, body) {
  const normalizedQuestion = normalizeText(body.question);
  const cacheKey = `retrieval:${body.tenantId}:${body.siteId}:${await hashKey(
    normalizedQuestion,
  )}`;
  const cached = await cacheMatch(cacheKey);
  if (cached) return { matches: cached, cached: true };

  const vector = await embedTextCached(
    env,
    body.question,
    EMBEDDING_CACHE_TTL_SECONDS,
  );
  const [tenantResults, curatedResults] = await Promise.all([
    env.VECTORIZE.query(vector, {
      topK: RETRIEVAL_TOP_K,
      namespace: body.tenantId,
      returnMetadata: "all",
      filter: { siteId: body.siteId },
    }),
    env.VECTORIZE.query(vector, {
      topK: RETRIEVAL_TOP_K,
      namespace: CURATED_NAMESPACE,
      returnMetadata: "all",
    }),
  ]);

  const matches = [...tenantResults.matches, ...curatedResults.matches].map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata || {},
  }));
  await cachePut(cacheKey, matches, RETRIEVAL_CACHE_TTL_SECONDS);
  return { matches, cached: false };
}

async function syncIndex(env) {
  const curatedCount = await indexCuratedPlaybooks(env);
  const issueCount = await indexResolvedIssues(env);
  return { curatedCount, issueCount };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncIndex(env).catch((error) => {
        console.error("issue knowledge sync failed", { message: error.message });
      }),
    );
  },

  async fetch(request, env) {
    if (!isAuthorized(request, env)) {
      return json({ error: "unauthorized", message: "Authentication is required." }, 401);
    }
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed", message: "POST is required." }, 405);
    }

    const body = await parseRequestBody(request);
    const path = new URL(request.url).pathname;

    try {
      if (path === "/sync") {
        return json(await syncIndex(env));
      }
      if (path === "/retrieve") {
        if (!isValidScope(body)) {
          return json({ error: "invalid_request", message: "A valid tenant, site, and question are required." }, 400);
        }
        return json(await retrieve(env, body));
      }
      return json({ error: "not_found", message: "Route not found." }, 404);
    } catch (error) {
      console.error("issue knowledge request failed", {
        path,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return json({ error: "retrieval_failed", message: "Unable to retrieve issue knowledge." }, 502);
    }
  },
};

