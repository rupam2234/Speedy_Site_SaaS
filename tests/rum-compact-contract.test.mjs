import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { legacyEventsToV2, validateV2Payload } from "../src/lib/rum/contract.js";
import {
	boundDiagnosticEvidence,
	v2ToLegacyEvents,
	v2ToStoragePayload,
} from "../src/lib/rum/storage.js";
import {
	classifyDevice,
	normalizeEvidenceUrl,
	normalizeReferrerDomain,
	parseBrowserFamily,
	parseOsFamily,
} from "../src/lib/rum/normalize.js";

const root = path.resolve(import.meta.dirname, "..");
const fixtureDir = path.join(root, "tests", "fixtures", "rum");
const workerSource = fs.readFileSync(path.join(root, "cloudflare-workers", "event-buffer", "src", "index.js"), "utf8");
const TARGET_BYTES = 8 * 1024;

function fixture(name) {
	return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));
}

function toV2(name, context = {}) {
	const payload = fixture(name);
	return legacyEventsToV2(payload.data, {
		pageviewId: payload.pageview_id,
		sessionId: payload.sessionId,
		currentPage: payload.currentPage,
		previousPage: payload.previousPage,
		currentHostname: payload.siteDomain,
		referrer: context.referrer ?? null,
		...context,
	});
}

describe("compact RUM v2 collector contract", () => {
	it("classifies desktop and mobile devices by capability signals", () => {
		assert.equal(
			classifyDevice({
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
				maxTouchPoints: 0,
				viewportWidth: 1920,
			}),
			"desktop"
		);
		assert.equal(
			classifyDevice({
				userAgentData: { mobile: true },
				viewportWidth: 390,
			}),
			"mobile"
		);
		assert.equal(classifyDevice({ viewportWidth: 390 }), "mobile");
		assert.equal(classifyDevice({ viewportWidth: 1440 }), "desktop");
	});

	it("coarsely parses browser and OS families without retaining the user agent", () => {
		const userAgent = "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0.0.0 Mobile Safari/537.36";
		assert.equal(parseBrowserFamily(userAgent), "chrome");
		assert.equal(parseOsFamily(userAgent), "android");
		const payload = toV2("passive-mobile.json");
		assert.equal(JSON.stringify(payload).includes("Mozilla/5.0"), false);
		assert.equal("user_agent" in payload.facts.client, false);
	});

	it("normalizes external referrers to hostnames and drops internal referrers", () => {
		assert.equal(
			normalizeReferrerDomain("https://www.Example.com/path?q=secret", "shop.test"),
			"example.com"
		);
		assert.equal(normalizeReferrerDomain("https://shop.test/path", "shop.test"), null);
		assert.equal(normalizeReferrerDomain("not a url", "shop.test"), null);
	});

	it("redacts credentials, fragments, and query strings from evidence URLs", () => {
		assert.equal(
			normalizeEvidenceUrl("https://user:pass@example.com/private?q=token#fragment"),
			"/private"
		);
	});

	it("keeps representative desktop, mobile, interactive, and slow payloads below 8 KiB", () => {
		for (const name of [
			"passive-desktop.json",
			"passive-mobile.json",
			"interactive.json",
			"slow-page.json",
		]) {
			const payload = toV2(name);
			const bytes = Buffer.byteLength(JSON.stringify(payload));
			assert.ok(bytes < TARGET_BYTES, `${name} was ${bytes} bytes`);
		}
	});

	it("retains INP attribution for continuation payloads", () => {
		const payload = toV2("interactive.json");
		assert.equal(payload.facts.vitals.inp.value_ms, 380);
		assert.equal(payload.evidence.inp.target, "button#pay");
		assert.equal(payload.evidence.inp.scripts.length, 1);
		assert.equal(payload.evidence.inp.scripts[0].url, "/wp-content/plugins/checkout.js");
	});

	it("keeps only bounded diagnostic candidates and normalized error signatures", () => {
		const payload = toV2("slow-page.json");
		assert.ok(payload.evidence.slow_resources.length <= 5);
		assert.ok(payload.evidence.render_blockers.length <= 3);
		assert.ok(payload.evidence.errors.length <= 5);
		assert.equal(payload.evidence.errors[0].signature, "TypeError: undefined is not a function");
		assert.equal(payload.evidence.errors[0].source, "/wp-content/plugins/carousel.js");
		assert.equal("stack" in payload.evidence.errors[0], false);
	});

	it("validates unknown versions and unknown canonical fields", () => {
		const payload = toV2("passive-desktop.json");
		assert.equal(validateV2Payload(payload).valid, true);
		assert.equal(validateV2Payload({ ...payload, schema_version: 3 }).valid, false);
		assert.equal(validateV2Payload({ ...payload, extra: true }).valid, false);
		assert.equal(
			validateV2Payload({ ...payload, facts: { ...payload.facts, extra: true } }).valid,
			false
		);
	});

	it("bounds diagnostic evidence below the database limit", () => {
		const evidence = {
			lcp: Array.from({ length: 20 }, () => ({ url: "/x".repeat(200) })),
			render_blockers: [],
			slow_resources: Array.from({ length: 20 }, () => ({ url: "/y".repeat(200) })),
			cls_shifts: [],
			inp: null,
			errors: [],
		};
		const bounded = boundDiagnosticEvidence(evidence);
		assert.ok(Buffer.byteLength(JSON.stringify(bounded)) < 4096);
	});

	it("bounds a single oversized evidence field", () => {
		const bounded = boundDiagnosticEvidence({
			lcp: [],
			render_blockers: [],
			slow_resources: [],
			cls_shifts: [{ target: "x".repeat(10000), value: 0.1 }],
			inp: { target: "y".repeat(10000), scripts: [] },
			errors: [],
		});
		assert.ok(Buffer.byteLength(JSON.stringify(bounded)) < 4096);
		assert.ok(bounded.cls_shifts[0].target.length <= 120);
		assert.ok(bounded.inp.target.length <= 120);
	});

	it("dual-writes canonical facts and compatible legacy events", () => {
		const payload = toV2("slow-page.json", { referrer: "https://www.google.com/search?q=private" });
		const storage = v2ToStoragePayload(payload, {
			domain: "example.com",
			geo: { country: "US", region: "CA", city: "San Francisco" },
			provider: "google",
		});
		assert.equal(storage.schema_version, 2);
		assert.equal(storage.domain_name, "example.com");
		assert.equal(storage.referrer_domain, "google.com");
		assert.equal(storage.device_type, "mobile");
		assert.equal(storage.browser_family, "chrome");
		assert.equal(storage.os_family, "android");
		assert.equal(storage.lcp_ms, 5600);
		assert.equal(storage.inp_ms, null);
		assert.ok(storage.events.some((event) => event.type === "client-info"));
		assert.ok(storage.events.some((event) => event.type === "web-vital" && event.name === "LCP"));
		assert.ok(storage.events.some((event) => event.type === "navigation-timings"));
		assert.ok(storage.events.some((event) => event.type === "resource-summary"));
	});

	it("preserves v1 events in the legacy compatibility projection", () => {
		const legacy = fixture("interactive.json").data;
		const payload = toV2("interactive.json");
		const events = v2ToLegacyEvents(payload);
		assert.ok(events.length > 0);
		assert.ok(events.some((event) => event.type === "client-info"));
		assert.ok(legacy.some((event) => event.type === "web-vital" && event.name === "INP"));
	});

	it("projects continuation payloads to only the newly observed INP event", () => {
		const payload = toV2("interactive.json");
		const continuation = {
			...payload,
			facts: {
				client: {},
				navigation: {},
				vitals: { inp: payload.facts.vitals.inp },
				resources: {},
				diagnostics: {},
			},
			evidence: {
				lcp: [],
				render_blockers: [],
				slow_resources: [],
				cls_shifts: [],
				inp: payload.evidence.inp,
				errors: [],
			},
		};
		const events = v2ToLegacyEvents(continuation);
		assert.equal(events.length, 1);
		assert.equal(events[0].name, "INP");
		assert.equal(events[0].attribution.target, "button#pay");
	});

	it("strips unsafe page queries and rejects malformed typed metrics", () => {
		const payload = toV2("passive-desktop.json");
		assert.equal(payload.current_page, "/");
		const queryPayload = { ...payload, current_page: "/products?token=secret" };
		assert.equal(validateV2Payload(queryPayload).valid, true);
		const storage = v2ToStoragePayload(queryPayload, { domain: "example.com" });
		assert.equal(storage.current_page, "/products");
		const malformed = {
			...payload,
			facts: { ...payload.facts, vitals: { lcp: { value_ms: -1, rating: "good" } } },
		};
		assert.equal(validateV2Payload(malformed).valid, false);
	});

	it("keeps Worker rollout, authentication, size, and canonical write guards", () => {
		assert.match(workerSource, /data\?\.schema_version === 2/);
		assert.match(workerSource, /Unsupported schema version/);
		assert.match(workerSource, /validateV2Payload\(data\)/);
		assert.match(workerSource, /originHost\(request\)/);
		assert.match(workerSource, /new TextEncoder\(\)\.encode\(body\)\.byteLength > MAX_BODY_BYTES/);
		assert.match(workerSource, /v2ToStoragePayload\(data/);
		assert.match(workerSource, /normalizeProvider\(request\.cf\)/);
		assert.match(workerSource, /data\.schema_version === 2 \? data\.session_id : data\.sessionId/);
		assert.match(workerSource, /rum_payload_rejected/);
		assert.match(workerSource, /rejected_payload_count/);
		assert.match(workerSource, /supabase_latency_ms/);
		assert.match(workerSource, /row_count/);
		assert.doesNotMatch(workerSource, /org:\s*source\.asOrganization/);
	});
});
