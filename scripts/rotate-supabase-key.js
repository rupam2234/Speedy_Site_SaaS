/* eslint-disable */
/**
 * One-off helper: completes the Supabase key rotation (2026-10-13).
 *
 * The old service key was committed in wrangler.jsonc (git history), so it was
 * rotated in the Supabase dashboard and the updated keys were placed in
 * .env.local. This script verifies the new keys, pushes them into every
 * worker secret store, then smoke-tests the live pipeline.
 *
 * Key values are read from .env.local at runtime and never printed.
 * Idempotent: safe to re-run.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function envValue(name) {
  const text = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const line = text
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(name + "="));
  if (!line) return undefined;
  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = envValue("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = envValue("SUPABASE_SERVICE_ROLE_KEY");
const PUBLISHABLE_KEY = envValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const API_SECRET = envValue("ANALYTICS_API_SECRET");
const CRON_SECRET = envValue("CRON_SECRET_TOKEN");

const WORKERS = {
  "analytics-cron": path.join(ROOT, "cloudflare-workers", "analytics", "analytics-cron"),
  "traffic-source-cron": path.join(ROOT, "cloudflare-workers", "analytics", "traffic-source-cron"),
  "event-buffer": path.join(ROOT, "cloudflare-workers", "event-buffer"),
  "site-metadata": path.join(ROOT, "cloudflare-workers", "site-metadata"),
};

const WORKER_BASE = {
  "analytics-cron": "https://analytics-cron.thespeedysite.workers.dev",
  "traffic-source-cron": "https://traffic-source-cron.thespeedysite.workers.dev",
  "site-metadata": "https://site-metadata.thespeedysite.workers.dev",
};

function fail(msg) {
  console.error("ABORT: " + msg);
  process.exit(1);
}

function checkPresence() {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    ANALYTICS_API_SECRET: API_SECRET,
    CRON_SECRET_TOKEN: CRON_SECRET,
  };
  const missing = Object.keys(values).filter((n) => !values[n]);
  if (missing.length) fail("missing in .env.local: " + missing.join(", "));
  console.log("env: all 5 required keys present");
}

function readWorkerSupabaseUrl(dir) {
  const config = fs.readFileSync(path.join(dir, "wrangler.jsonc"), "utf8");
  const m = config.match(/"SUPABASE_URL"\s*:\s*"([^"]+)"/);
  return m ? m[1] : undefined;
}

async function probe(url, key) {
  // The /rest/v1/ root rejects sb_publishable_ keys; a table read is the valid check
  const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20000),
  });
  return res.status;
}

async function verifyKeys() {
  for (const [name, dir] of Object.entries(WORKERS)) {
    const workerUrl = readWorkerSupabaseUrl(dir);
    if (workerUrl !== SUPABASE_URL) {
      fail(
        `${name} wrangler.jsonc SUPABASE_URL (${workerUrl}) != .env.local (${SUPABASE_URL}). ` +
          "Keys are from a different project; update wrangler vars first."
      );
    }
  }
  console.log("parity: all 4 workers point at the same Supabase project");

  const serviceStatus = await probe(SUPABASE_URL, SERVICE_KEY);
  console.log("service key probe: HTTP " + serviceStatus);
  if (serviceStatus !== 200) {
    fail("service key rejected by Supabase (HTTP " + serviceStatus + "); not syncing an invalid key");
  }

  const publishableStatus = await probe(SUPABASE_URL, PUBLISHABLE_KEY);
  console.log("publishable key probe: HTTP " + publishableStatus);
  if (publishableStatus !== 200) {
    console.warn("WARNING: publishable key rejected (HTTP " + publishableStatus + "); client auth will fail");
  }

  const read = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(20000),
  });
  console.log(
    "service key data read (profiles): HTTP " + read.status + (read.ok ? " (RLS bypass confirmed)" : " (UNEXPECTED)")
  );
}

// Multi-account login: wrangler cannot select an account in non-interactive mode
const CF_ACCOUNT_ID = "88799a4de427e27216ffe4056caf1fa4";

function wranglerSecretPut(dir, name, value) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["wrangler", "secret", "put", name], {
      cwd: dir,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.stdin.write(value);
    child.stdin.end();
    const timer = setTimeout(() => child.kill(), 180000);
    child.on("close", (code) => {
      clearTimeout(timer);
      const ok = code === 0 && /Success/i.test(out);
      const tail = out.trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] || "";
      console.log(
        `  ${path.basename(dir)} <- ${name}: ${ok ? "OK" : "FAILED (code " + code + ")"}` +
          (ok ? "" : " | " + tail.slice(0, 300))
      );
      resolve(ok);
    });
  });
}

async function syncSecrets() {
  console.log("\n-- Stage 2: sync worker secrets --");
  let allOk = true;
  for (const [name, dir] of Object.entries(WORKERS)) {
    allOk = (await wranglerSecretPut(dir, "SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY)) && allOk;
  }
  allOk = (await wranglerSecretPut(WORKERS["site-metadata"], "CRON_SECRET", CRON_SECRET)) && allOk;
  for (const n of ["analytics-cron", "traffic-source-cron"]) {
    allOk = (await wranglerSecretPut(WORKERS[n], "API_SECRET", API_SECRET)) && allOk;
  }
  if (!allOk) fail("one or more secret uploads failed");
}

async function smoke(name, pathName, opts) {
  try {
    const res = await fetch(WORKER_BASE[name] + pathName, {
      ...opts,
      signal: AbortSignal.timeout(60000),
    });
    console.log(`${name} ${opts.method || "GET"} ${pathName}: HTTP ${res.status}`);
    return res;
  } catch (e) {
    console.log(`${name} ${opts.method || "GET"} ${pathName}: REQUEST FAILED (${e.message})`);
    return null;
  }
}

async function smokeTests() {
  console.log("\n-- Stage 3: live smoke tests --");
  await smoke("analytics-cron", "/health", {});
  await smoke("traffic-source-cron", "/health", {});

  const runJob = await smoke("analytics-cron", "/run-job", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_SECRET}` },
  });
  if (runJob && runJob.status !== 200) {
    console.warn("WARNING: /run-job returned " + runJob.status + "; secret may still be propagating, retry in a minute");
  }

  const syncRes = await smoke("site-metadata", "/", {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  if (syncRes && syncRes.status === 200) {
    console.log("  site-metadata sync summary: " + JSON.stringify(await syncRes.json()));
  } else if (syncRes && syncRes.status === 404) {
    console.warn("  site-metadata is not deployed yet; secret stored, deploy pending");
  }
}

async function main() {
  console.log("-- Stage 1: verify new keys --");
  checkPresence();
  await verifyKeys();
  await syncSecrets();
  await smokeTests();
  console.log(
    "\nDone. Rotation propagated: service key on 4 workers, CRON_SECRET on site-metadata, API_SECRET on both analytics workers."
  );
}

main().catch((err) => fail(err.message));

