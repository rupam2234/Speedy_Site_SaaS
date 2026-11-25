#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "tests", "fixtures", "rum");
const outputDir = path.join(root, "docs", "reports");
const TARGET_BYTES = 8 * 1024;

function collectValues(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectValues(item, output));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      output.push({ path: key, value: item });
      collectValues(item, output);
    });
  }
  return output;
}

function measureFixture(file) {
  const raw = fs.readFileSync(file, "utf8");
  const payload = JSON.parse(raw);
  const serialized = JSON.stringify(payload);
  const values = collectValues(payload);
  const forbidden = [];
  const forbiddenNames = new Set(["userAgent", "hardwareConcurrency", "org", "stack"]);
  for (const item of values) {
    if (forbiddenNames.has(item.path)) forbidden.push(item.path);
  }
  const eventTypes = payload.data
    .map((event) => event?.type)
    .filter(Boolean);
  return {
    fixture: path.basename(file),
    bytes: Buffer.byteLength(serialized),
    kib: Number((Buffer.byteLength(serialized) / 1024).toFixed(2)),
    eventCount: payload.data.length,
    eventTypes,
    forbiddenFields: forbidden,
    withinTarget: Buffer.byteLength(serialized) < TARGET_BYTES,
  };
}

function main() {
  const fixtures = fs.readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => measureFixture(path.join(fixtureDir, name)));
  const report = {
    generatedAt: new Date().toISOString(),
    targetBytes: TARGET_BYTES,
    note: "Fixture-derived v1 browser payload sizes. Production sizes require a captured browser beacon sample.",
    fixtures,
  };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "rum-payload-baseline.json"), `${JSON.stringify(report, null, 2)}\n`);
  for (const fixture of fixtures) {
    console.log(`${fixture.fixture}: ${fixture.bytes} bytes (${fixture.kib} KiB), target=${fixture.withinTarget ? "pass" : "over"}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

export { measureFixture, TARGET_BYTES };
