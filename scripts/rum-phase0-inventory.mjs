#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const outputDir = path.join(root, "docs", "reports");

function listFiles(dir, extensions) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath, extensions);
      return extensions.includes(path.extname(entry.name)) ? [fullPath] : [];
    });
}

function splitFunctions(sql) {
  const functions = [];
  const lines = sql.split("\n");
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const start = offset;
    offset += line.length + 1;
    if (!line.toUpperCase().startsWith("CREATE OR REPLACE FUNCTION")) continue;

    const nameMatch = line.match(/FUNCTION\s+(?:"public"\.)?"?([a-zA-Z0-9_]+)"?/i);
    if (!nameMatch) continue;
    const bodyStart = sql.indexOf("AS ", start);
    if (bodyStart === -1) continue;
    const bodyMatch = sql.slice(bodyStart).match(/AS\s+(\$\$|\$_\$)/i);
    if (!bodyMatch) continue;
    const delimiter = bodyMatch[1];
    const bodyStartAt = bodyStart + bodyMatch.index + bodyMatch[0].length;
    const bodyEnd = sql.indexOf(delimiter, bodyStartAt);
    if (bodyEnd === -1) continue;

    functions.push({
      name: nameMatch[1],
      body: sql.slice(bodyStartAt, bodyEnd),
      line: index + 1,
    });
  }
  return functions;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function classifyField(field, eventTypes) {
  const emitted = new Set([
    "deviceType", "deviceMemory", "hardwareConcurrency", "connection.effectiveType",
    "connection.downlink", "connection.rtt", "userAgent", "language", "type", "name",
    "value", "rating", "timestamp", "cacheStatus", "originHit", "provider", "siteDomain",
    "country", "region", "city", "timezone", "continent", "org", "timeToFirstByte",
    "backendResponseTime", "dnsLookup", "tcpConnectionTime", "tlsHandshakeTime",
    "requestQueueTime", "redirectDuration", "userConnectionTime", "experienceCategory",
    "transferSize", "encodedBodySize", "decodedBodySize", "serverTiming", "attribution",
    "totalRequests", "totalTransferSize", "byType", "slowest", "errors",
  ]);
  const legacy = new Set([
    "sessionId", "pageAddress", "origin-info", "fetchPriority", "long-task",
    "slow-api-call", "tracker-detected",
  ]);
  if (legacy.has(field) || legacy.has(eventTypes)) return "legacy-only";
  if (emitted.has(field)) return "required";
  return "optional";
}


function buildInventory() {
  const sqlFiles = listFiles(migrationsDir, [".sql"]);
  const readers = [];
  for (const file of sqlFiles) {
    const sql = fs.readFileSync(file, "utf8");
    for (const fn of splitFunctions(sql)) {
      const readsEvents = /jsonb_array_elements\s*\([^)]*events|jsonb_path_(?:query|match)\s*\(\s*events|\bevents\s*@>/i.test(fn.body);
      if (!readsEvents) continue;
      const eventTypes = unique(
        Array.from(fn.body.matchAll(new RegExp("->>\\s*'type'\\s*=\\s*'([^']+)'", "gi")))
          .map((match) => match[1]),
      );
      const fields = unique([
        ...Array.from(fn.body.matchAll(new RegExp("->>\\s*'([^']+)'", "gi"))).map((match) => match[1]),
        ...Array.from(fn.body.matchAll(new RegExp("->\\s*'([^']+)'", "gi"))).map((match) => match[1]),
      ]);
      readers.push({
        function: fn.name,
        source: path.relative(root, file).replaceAll("\\", "/"),
        line: fn.line,
        eventTypes,
        fields: fields.map((field) => ({
          field,
          classification: classifyField(field, eventTypes.join(",")),
        })),
      });
    }
  }

  const sourceFiles = listFiles(root, [".ts", ".tsx", ".js", ".mjs"]).filter((file) =>
    !file.includes(`${path.sep}node_modules${path.sep}`) &&
    !file.includes(`${path.sep}.next${path.sep}`) &&
    !file.endsWith(path.join("scripts", "rum-phase0-inventory.mjs")),
  );
  const callers = [];
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, "utf8");
    const names = new Set(readers.map((reader) => reader.function));
    for (const match of source.matchAll(/\.rpc\s*\(\s*['"]([^'"]+)['"]/g)) {
      if (!names.has(match[1])) continue;
      callers.push({
        function: match[1],
        source: path.relative(root, file).replaceAll("\\", "/"),
        line: source.slice(0, match.index).split("\n").length,
      });
    }
  }

  const telemetrySources = [
    fs.readFileSync(path.join(root, "scripts", "extended-rum.js"), "utf8"),
    fs.readFileSync(path.join(root, "cloudflare-workers", "event-buffer", "src", "index.js"), "utf8"),
  ].join("\n");
  const collectorTypes = unique(
    Array.from(telemetrySources.matchAll(/(?:queueEvent\s*\(\s*\{|data\.push\s*\(\s*\{|return\s*\{)\s*type\s*:\s*["']([^"']+)["']/g))
      .map((match) => match[1]),
  );
  const unusedCollectorTypes = collectorTypes.filter((type) =>
    !readers.some((reader) => reader.eventTypes.includes(type)),
  );

  return {
    generatedAt: new Date().toISOString(),
    source: "supabase/migrations and production application callers",
    readers: readers.sort((a, b) => a.function.localeCompare(b.function)),
    callers: callers.sort((a, b) => a.function.localeCompare(b.function)),
    summary: {
      readerCount: readers.length,
      callerCount: callers.length,
      referencedFieldCount: new Set(readers.flatMap((reader) => reader.fields.map((field) => field.field))).size,
      unusedCollectorTypes,
    },
  };
}


function toMarkdown(inventory) {
  const lines = [
    "# RUM Events Reader Inventory",
    "",
    `Generated at: ${inventory.generatedAt}`,
    "",
    "This inventory is generated from `scripts/rum-phase0-inventory.mjs`. It lists SQL functions that read `rum_metrics.events` and application callers of those functions.",
    "",
    `Readers: **${inventory.summary.readerCount}**`,
    `Application callers: **${inventory.summary.callerCount}**`,
    "",
    "## SQL readers",
    "",
    "| Function | Event types | Fields | Source |",
    "| :--- | :--- | :--- | :--- |",
  ];
  for (const reader of inventory.readers) {
    const types = reader.eventTypes.map((value) => `\`${value}\``).join(", ") || "shape-dependent";
    const fields = reader.fields.map((field) => `\`${field.field}\` (${field.classification})`).join(", ") || "none";
    lines.push(`| \`${reader.function}\` | ${types} | ${fields} | \`${reader.source}:${reader.line}\` |`);
  }
  lines.push("", "## Application callers", "", "| Function | Source |", "| :--- | :--- |");
  for (const caller of inventory.callers) {
    lines.push(`| \`${caller.function}\` | \`${caller.source}:${caller.line}\` |`);
  }
  lines.push("", "## Collector event types not found in SQL readers", "");
  if (inventory.summary.unusedCollectorTypes.length === 0) {
    lines.push("None detected.");
  } else {
    for (const type of inventory.summary.unusedCollectorTypes) lines.push(`- \`${type}\``);
  }
  lines.push("", "## Classification", "",
    "- **required**: currently emitted by the collector and read by at least one SQL reader.",
    "- **optional**: read by a reader but not emitted by the current collector, or emitted only for a specialized branch.",
    "- **legacy-only**: historical shape that the current collector does not emit, including event-level `sessionId`, `pageAddress`, and `origin-info`.",
    "- **unused**: collector event type with no detected SQL reader.",
  );
  return `${lines.join("\n")}\n`;
}

function main() {
  const inventory = buildInventory();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "rum-events-reader-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "rum-events-reader-inventory.md"), toMarkdown(inventory));
  console.log(`Inventory written: ${inventory.summary.readerCount} SQL readers, ${inventory.summary.callerCount} callers`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

export { buildInventory, toMarkdown, splitFunctions };
