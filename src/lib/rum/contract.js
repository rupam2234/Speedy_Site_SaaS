import {
	finiteNumber,
	nonNegativeInteger,
	normalizeEvidenceUrl,
	normalizeNetwork,
	normalizePagePath,
	normalizeRating,
	normalizeReferrerDomain,
	parseBrowserFamily,
	parseOsFamily,
} from "./normalize.js";

const V2_TOP_LEVEL_KEYS = new Set([
	"schema_version",
	"pageview_id",
	"session_id",
	"current_page",
	"previous_page",
	"referrer_domain",
	"facts",
	"evidence",
]);

const V2_FACT_KEYS = new Set(["client", "navigation", "vitals", "resources", "diagnostics"]);
const V2_EVIDENCE_KEYS = new Set(["lcp", "render_blockers", "slow_resources", "cls_shifts", "inp", "errors"]);

function firstEvent(data, type) {
	return data.find((event) => event?.type === type) || null;
}

function allEvents(data, type) {
	return data.filter((event) => event?.type === type);
}

function vitalsFromEvents(data) {
	const vitals = {};
	for (const event of allEvents(data, "web-vital")) {
		const name = String(event.name || "").toUpperCase();
		if (!["FCP", "LCP", "CLS", "INP", "TTFB"].includes(name)) continue;
		const value = name === "CLS"
			? finiteNumber(event.value) === null
				? null
				: Math.round(finiteNumber(event.value) * 10000) / 10000
			: nonNegativeInteger(event.value);
		vitals[name.toLowerCase()] = { value, value_ms: name === "CLS" ? undefined : value, rating: normalizeRating(event.rating) };
		if (name === "CLS") delete vitals.cls.value_ms;
	}
	return vitals;
}

function clientFromEvents(data, context = {}) {
	const event = firstEvent(data, "client-info");
	const userAgent = context.userAgent || event?.userAgent || "";
	const deviceType = context.deviceType || event?.deviceType || "unknown";
	const memory = Number(context.deviceMemory || event?.deviceMemory);
	return {
		device_type: ["desktop", "mobile", "tablet", "unknown"].includes(deviceType) ? deviceType : "unknown",
		browser_family: context.browserFamily || parseBrowserFamily(userAgent),
		os_family: context.osFamily || parseOsFamily(userAgent),
		device_memory_gb: Number.isFinite(memory) ? Math.min(16, Math.max(0, Math.round(memory))) : null,
		language: context.language || event?.language || null,
		network: normalizeNetwork(context.connection || event?.connection),
	};
}

function navigationFromEvents(data) {
	const event = firstEvent(data, "navigation-timings");
	if (!event) return null;
	return {
		ttfb_ms: nonNegativeInteger(event.timeToFirstByte),
		backend_ms: nonNegativeInteger(event.backendResponseTime),
		dns_ms: nonNegativeInteger(event.dnsLookup),
		connect_ms: nonNegativeInteger(event.tcpConnectionTime),
		tls_handshake_ms: nonNegativeInteger(event.tlsHandshakeTime),
		redirect_ms: nonNegativeInteger(event.redirectDuration),
		queue_ms: nonNegativeInteger(event.requestQueueTime),
		cache_status: event.cacheStatus || "unknown",
		origin_hit: event.cacheStatus === "memory-cache" || event.cacheStatus === "disk-cache",
		transfer_bytes: nonNegativeInteger(event.transferSize),
		decoded_bytes: nonNegativeInteger(event.decodedBodySize),
	};
}

function resourcesFromEvents(data) {
	const event = firstEvent(data, "resource-summary");
	if (!event) return null;
	const byType = {};
	for (const [type, value] of Object.entries(event.byType || {})) {
		const normalizedType = ["script", "img", "css"].includes(type) ? type : "other";
		byType[normalizedType] = {
			count: nonNegativeInteger(value.count),
			duration_ms: nonNegativeInteger(value.totalDuration),
			bytes: nonNegativeInteger(value.totalTransferSize),
		};
	}
	return {
		request_count: nonNegativeInteger(event.totalRequests),
		transfer_bytes: nonNegativeInteger(event.totalTransferSize),
		duration_ms: nonNegativeInteger(event.totalDuration),
		by_type: byType,
	};
}

function lcpEvidence(data) {
	const candidates = [];
	for (const event of allEvents(data, "web-vital").filter((item) => item.name === "LCP")) {
		const attribution = event.attribution || {};
		candidates.push({
			url: normalizeEvidenceUrl(attribution.url),
			target: attribution.target || null,
			resource_load_delay_ms: nonNegativeInteger(attribution.resourceLoadDelay),
			resource_load_duration_ms: nonNegativeInteger(attribution.resourceLoadDuration),
			element_render_delay_ms: nonNegativeInteger(attribution.elementRenderDelay),
			transfer_bytes: nonNegativeInteger(attribution.transferSize),
			decoded_bytes: nonNegativeInteger(attribution.decodedBodySize),
		});
	}
	return candidates.sort((a, b) => (b.element_render_delay_ms || 0) - (a.element_render_delay_ms || 0)).slice(0, 3);
}

function renderBlockerEvidence(data) {
	const blockers = [];
	for (const event of data) {
		const items = Array.isArray(event) ? event : Array.isArray(event?.blocks) ? event.blocks : [];
		for (const item of items) {
			if (!item || typeof item !== "object") continue;
			blockers.push({
				url: normalizeEvidenceUrl(item.URL || item.url),
				finish_time_ms: nonNegativeInteger(parseFloat(item["Finish Time"])),
				fcp_delay_ms: nonNegativeInteger(parseFloat(item["FCP Delay"])),
			});
		}
	}
	return blockers.sort((a, b) => (b.fcp_delay_ms || 0) - (a.fcp_delay_ms || 0)).slice(0, 3);
}

function slowResourceEvidence(data) {
	const resources = [];
	for (const event of allEvents(data, "resource-summary")) {
		for (const item of event.slowest || []) {
			resources.push({
				url: normalizeEvidenceUrl(item.url),
				type: item.type || "other",
				duration_ms: nonNegativeInteger(item.duration),
				transfer_bytes: nonNegativeInteger(item.transferSize),
				decoded_bytes: nonNegativeInteger(item.decodedSize),
				status: nonNegativeInteger(item.status),
				phases: item.phases || null,
			});
		}
	}
	return resources.sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0)).slice(0, 5);
}

function clsEvidence(data) {
	const shifts = [];
	for (const event of allEvents(data, "web-vital").filter((item) => item.name === "CLS")) {
		for (const shift of event.attribution?.shifts || []) {
			shifts.push({
				target: shift.element || event.attribution?.largestShiftTarget || "(unknown)",
				value: finiteNumber(shift.value),
				viewport_ratio: finiteNumber(shift.impact?.viewportRatio),
			});
		}
	}
	return shifts.sort((a, b) => (b.viewport_ratio || 0) - (a.viewport_ratio || 0)).slice(0, 3);
}

function inpEvidence(data) {
	for (const event of allEvents(data, "web-vital").filter((item) => item.name === "INP")) {
		const attribution = event.attribution || {};
		const scripts = attribution.loaf?.scripts || (attribution.loaf ? [attribution.loaf] : []);
		return {
			target: attribution.target || "(unknown)",
			event_type: attribution.eventType || "unknown",
			input_delay_ms: nonNegativeInteger(attribution.inputDelay),
			processing_ms: nonNegativeInteger(attribution.processingDuration),
			presentation_ms: nonNegativeInteger(attribution.presentationDelay),
			scripts: scripts.slice(0, 3).map((script) => ({
				url: normalizeEvidenceUrl(script.sourceURL || script.url),
				duration_ms: nonNegativeInteger(script.duration),
				invoker: script.invoker || null,
			})),
		};
	}
	return null;
}

function errorEvidence(data) {
	const errors = [];
	for (const event of allEvents(data, "errors")) {
		for (const error of event.errors || []) {
			const signature = String(error.message || error.kind || "unknown-error")
				.replace(/https?:\/\/[^\s)]+/gi, "[url]")
				.replace(/[?#][^\s)]*/g, "")
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, 120);
			errors.push({
				signature: signature || "unknown-error",
				source: normalizeEvidenceUrl(error.source || error.url),
				count: nonNegativeInteger(error.count) || 1,
				first_seen_ms: nonNegativeInteger(error.firstSeen),
			});
		}
	}
	return errors.sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 5);
}

export function legacyEventsToV2(data, context = {}) {
	const events = Array.isArray(data) ? data : [];
	const errorCount = allEvents(events, "errors").reduce((sum, event) => sum + (event.errors?.length || 0), 0);
	return {
		schema_version: 2,
		pageview_id: context.pageviewId,
		session_id: context.sessionId,
		current_page: normalizePagePath(context.currentPage),
		previous_page: normalizePagePath(context.previousPage),
		referrer_domain: normalizeReferrerDomain(context.referrer, context.currentHostname),
		facts: {
			client: clientFromEvents(events, context),
			navigation: navigationFromEvents(events),
			vitals: vitalsFromEvents(events),
			resources: resourcesFromEvents(events),
			diagnostics: {
				long_task_count: nonNegativeInteger(context.longTaskCount),
				failed_resource_count: nonNegativeInteger(context.failedResourceCount),
				error_count: errorCount,
			},
		},
		evidence: {
			lcp: lcpEvidence(events),
			render_blockers: renderBlockerEvidence(events),
			slow_resources: slowResourceEvidence(events),
			cls_shifts: clsEvidence(events),
			inp: inpEvidence(events),
			errors: errorEvidence(events),
		},
	};
}

function isFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value);
}

function validMetric(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	if (value.value_ms !== undefined && (!isFiniteNumber(value.value_ms) || value.value_ms < 0)) return false;
	if (value.value !== undefined && (!isFiniteNumber(value.value) || value.value < 0)) return false;
	if (value.rating !== null && !["good", "needs-improvement", "poor"].includes(value.rating)) return false;
	return true;
}

function validFacts(facts) {
	if (!facts || typeof facts !== "object" || Array.isArray(facts)) return false;
	for (const key of Object.keys(facts)) {
		if (!V2_FACT_KEYS.has(key)) return false;
	}
	const client = facts.client;
	if (client !== undefined) {
		if (!client || typeof client !== "object" || Array.isArray(client)) return false;
		if (client.device_type !== undefined && !["desktop", "mobile", "tablet", "unknown"].includes(client.device_type)) return false;
		if (client.browser_family !== undefined && client.browser_family !== null && typeof client.browser_family !== "string") return false;
		if (client.os_family !== undefined && client.os_family !== null && typeof client.os_family !== "string") return false;
		if (client.device_memory_gb !== undefined && client.device_memory_gb !== null && !isFiniteNumber(client.device_memory_gb)) return false;
		if (client.network !== undefined && client.network !== null) {
			if (typeof client.network !== "object" || Array.isArray(client.network)) return false;
			if (client.network.effective_type !== undefined && !["slow-2g", "2g", "3g", "4g", "unknown"].includes(client.network.effective_type)) return false;
			if (client.network.rtt_ms !== undefined && client.network.rtt_ms !== null && (!isFiniteNumber(client.network.rtt_ms) || client.network.rtt_ms < 0)) return false;
			if (client.network.downlink_mbps !== undefined && client.network.downlink_mbps !== null && (!isFiniteNumber(client.network.downlink_mbps) || client.network.downlink_mbps < 0)) return false;
		}
	}
	for (const [name, metric] of Object.entries(facts.vitals || {})) {
		if (!["fcp", "lcp", "cls", "inp", "ttfb"].includes(name) || !validMetric(metric)) return false;
	}
	return true;
}

function validEvidence(evidence) {
	if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return false;
	for (const key of Object.keys(evidence)) {
		if (!V2_EVIDENCE_KEYS.has(key)) return false;
		if (["lcp", "render_blockers", "slow_resources", "cls_shifts", "errors"].includes(key) && !Array.isArray(evidence[key])) return false;
	}
	return true;
}

export function validateV2Payload(payload) {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { valid: false, reason: "Invalid payload" };
	if (payload.schema_version !== 2) return { valid: false, reason: "Unsupported schema version" };
	for (const key of Object.keys(payload)) {
		if (!V2_TOP_LEVEL_KEYS.has(key)) return { valid: false, reason: `Unknown field: ${key}` };
	}
	if (typeof payload.pageview_id !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(payload.pageview_id)) {
		return { valid: false, reason: "Invalid pageview_id" };
	}
	if (typeof payload.session_id !== "string" || !/^[A-Za-z0-9._:-]{1,256}$/.test(payload.session_id)) {
		return { valid: false, reason: "Invalid session_id" };
	}
	if (typeof payload.current_page !== "string" || !payload.current_page.startsWith("/") || payload.current_page.length > 2048) {
		return { valid: false, reason: "Invalid current_page" };
	}
	if (payload.previous_page !== null && payload.previous_page !== undefined && (typeof payload.previous_page !== "string" || !payload.previous_page.startsWith("/") || payload.previous_page.length > 2048)) {
		return { valid: false, reason: "Invalid previous_page" };
	}
	if (payload.referrer_domain !== null && payload.referrer_domain !== undefined && (typeof payload.referrer_domain !== "string" || !/^[a-z0-9.-]{1,253}$/.test(payload.referrer_domain))) {
		return { valid: false, reason: "Invalid referrer_domain" };
	}
	if (!validFacts(payload.facts)) return { valid: false, reason: "Invalid facts" };
	if (!validEvidence(payload.evidence)) return { valid: false, reason: "Invalid evidence" };
	return { valid: true };
}
