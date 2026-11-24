import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildInventory } from "../scripts/rum-phase0-inventory.mjs";
import { measureFixture } from "../scripts/rum-phase0-payload.mjs";

const root = path.resolve(import.meta.dirname, "..");

describe("RUM Phase 0 baseline", () => {
  it("inventory includes known legacy readers and application callers", () => {
    const inventory = buildInventory();
    const readerNames = inventory.readers.map((reader) => reader.function);
    const callerNames = inventory.callers.map((caller) => caller.function);

    assert.ok(readerNames.includes("analyze_fcp_by_device"));
    assert.ok(readerNames.includes("analyze_lcp_by_device"));
    assert.ok(readerNames.includes("recent_requests"));
    assert.ok(readerNames.includes("user_happiness"));
    assert.ok(readerNames.includes("ux_map_data"));
    assert.ok(callerNames.includes("cls_elements"));
    assert.ok(callerNames.includes("inp_elements"));
    assert.ok(callerNames.includes("get_rum_web_vitals_metrics"));
    for (const retiredFunction of [
      "recent_requests",
      "traffic_source",
      "get_daily_web_metrics",
      "user_happiness_dist",
      "ux_map_data",
    ]) {
      assert.equal(callerNames.includes(retiredFunction), false, `${retiredFunction} still has an application caller`);
    }
    assert.ok(inventory.summary.readerCount >= 25);
    assert.ok(inventory.summary.callerCount >= 10);
    assert.ok(readerNames.includes("rum_metric_readings"));
    assert.ok(readerNames.includes("rum_lcp_candidates"));
    assert.ok(readerNames.includes("rum_cls_shifts"));
    assert.ok(readerNames.includes("rum_inp_interactions"));
    assert.equal(readerNames.includes("public"), false);
  });

  it("classifies legacy-only event fields", () => {
    const inventory = buildInventory();
    const sessionReader = inventory.readers.find((reader) => reader.function === "analyze_fcp_by_device");
    const sessionField = sessionReader?.fields.find((field) => field.field === "sessionId");

    assert.equal(sessionField?.classification, "legacy-only");
  });

  it("measures all representative payload classes under the target", () => {
    const fixtureDir = path.join(root, "tests", "fixtures", "rum");
    const fixtures = fs.readdirSync(fixtureDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => measureFixture(path.join(fixtureDir, name)));

    assert.equal(fixtures.length, 4);
    for (const fixture of fixtures) {
      assert.ok(fixture.bytes < 8 * 1024, `${fixture.fixture} exceeds the payload target`);
      assert.ok(fixture.forbiddenFields.includes("userAgent"));
    }
  });

  it("records the small dataset classification instead of claiming production scale", () => {
    const reportPath = path.join(root, "docs", "reports", "rum-database-baseline.json");
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    assert.ok(report.storage.datasetClassification);
    assert.ok(report.limitations.length >= 2);
  });
});
