#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "reports");

function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function rpc(url, key, name, body) {
  const started = performance.now();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const elapsed = performance.now() - started;
  const text = await response.text();
  return { ok: response.ok, status: response.status, elapsed, text };
}

async function main() {
  const env = loadEnv(path.join(root, ".env.local"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");

  const result = {
    generatedAt: new Date().toISOString(),
    source: "Supabase REST read-only aggregate queries",
    storage: null,
    readVolume: null,
    rpcLatency: [],
    limitations: [],
  };

  const sampleResponse = await fetch(`${url}/rest/v1/rum_metrics?select=events,created_at&limit=1000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!sampleResponse.ok) throw new Error(`rum_metrics sample failed: ${sampleResponse.status}`);
  const rows = await sampleResponse.json();
  const eventSizes = rows.map((row) => Buffer.byteLength(JSON.stringify(row.events ?? [])));
  const rowSizes = rows.map((row) => Buffer.byteLength(JSON.stringify(row)));

  const countResponse = await fetch(`${url}/rest/v1/rum_metrics?select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  const totalRows = Number(countResponse.headers.get("content-range")?.split("/")?.at(-1) || 0);

  const dayResponse = await fetch(`${url}/rest/v1/rum_metrics?select=id&created_at=gte.${new Date(Date.now() - 86400000).toISOString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  const rowsLastDay = Number(dayResponse.headers.get("content-range")?.split("/")?.at(-1) || 0);

  result.storage = {
    datasetClassification: totalRows >= 1000 ? "production-scale" : "small-development-or-low-traffic",
    totalRows,
    rowsLastDay,
    sampledRows: rows.length,
    eventBytes: {
      min: Math.min(...eventSizes),
      median: percentile(eventSizes, 0.5),
      p95: percentile(eventSizes, 0.95),
      max: Math.max(...eventSizes),
      mean: Math.round(eventSizes.reduce((sum, value) => sum + value, 0) / eventSizes.length),
    },
    sampledRowBytes: {
      min: Math.min(...rowSizes),
      median: percentile(rowSizes, 0.5),
      p95: percentile(rowSizes, 0.95),
      max: Math.max(...rowSizes),
      mean: Math.round(rowSizes.reduce((sum, value) => sum + value, 0) / rowSizes.length),
    },
  };

  const domainResponse = await fetch(`${url}/rest/v1/rum_metrics?select=domain_name&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const domainRows = await domainResponse.json();
  const domain = domainRows[0]?.domain_name;
  if (domain) {
    const calls = [
      ["recent_requests", { p_domain: domain, p_limit: 30 }],
      ["analyze_fcp_by_device", { domain_filter: domain, time_range: "30days" }],
      ["analyze_lcp_by_device", { domain_filter: domain }],
      ["cls_elements", { p_domain_name: domain }],
      ["inp_elements", { p_domain_name: domain }],
      ["page_performance_analysis", { p_domain: domain }],
      ["user_happiness_dist", { domain_filter: domain, start_date: "2026-01-01", end_date: "2027-01-01" }],
      ["ux_map_data", { domain_url: domain }],
    ];
    for (const [name, body] of calls) {
      const samples = [];
      for (let index = 0; index < 3; index += 1) {
        const response = await rpc(url, key, name, body);
        samples.push(response.elapsed);
        if (!response.ok) {
          result.rpcLatency.push({ name, ok: false, status: response.status });
          break;
        }
      }
      if (samples.length === 3) {
        result.rpcLatency.push({ name, ok: true, p50Ms: Math.round(percentile(samples, 0.5)), p95Ms: Math.round(percentile(samples, 0.95)) });
      }
    }
  }

  result.limitations.push("REST responses cannot expose PostgreSQL heap size, index size, or pg_stat_statements read counters without a direct database connection.");
  result.limitations.push("RPC timings include network latency and use a sampled site, so they are directional baselines rather than database-only execution times.");
  result.readVolume = { sampledRowsRead: rows.length, sampledRowBytes: result.storage.sampledRowBytes.mean * rows.length };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "rum-database-baseline.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Database baseline written: ${result.storage.totalRows} rows, ${result.storage.rowsLastDay} rows in the last day`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
