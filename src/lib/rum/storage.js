import { normalizeEvidenceUrl, normalizeHostname, normalizePagePath } from "./normalize.js";

const MAX_DIAGNOSTIC_EVIDENCE_BYTES = 3800;

function evidenceString(value, maxLength) {
	if (value === null || value === undefined) return null;
	return String(value).slice(0, maxLength);
}

function boundedPhases(phases) {
	if (!phases || typeof phases !== "object" || Array.isArray(phases)) return null;
	return {
		redirect: boundedInteger(phases.redirect),
		dns: boundedInteger(phases.dns),
		connect: boundedInteger(phases.connect),
		ssl: boundedInteger(phases.ssl),
		ttfb: boundedInteger(phases.ttfb),
		download: boundedInteger(phases.download),
	};
}

function boundedRect(rect) {
	if (!rect || typeof rect !== "object" || Array.isArray(rect)) return null;
	return {
		x: boundedSignedNumber(rect.x),
		y: boundedSignedNumber(rect.y),
		width: boundedInteger(rect.width),
		height: boundedInteger(rect.height),
	};
}

export function boundDiagnosticEvidence(evidence) {
	const bounded = {
		lcp: (evidence.lcp || []).slice(0, 3).map((item) => ({
			url: normalizeEvidenceUrl(item.url),
			target: evidenceString(item.target, 120),
			resource_load_delay_ms: boundedInteger(item.resource_load_delay_ms),
			resource_load_duration_ms: boundedInteger(item.resource_load_duration_ms),
			element_render_delay_ms: boundedInteger(item.element_render_delay_ms),
			candidate_ttfb_ms: boundedInteger(item.candidate_ttfb_ms),
			transfer_bytes: boundedInteger(item.transfer_bytes),
			decoded_bytes: boundedInteger(item.decoded_bytes),
			image_width: boundedInteger(item.image_width),
			image_height: boundedInteger(item.image_height),
			is_lazy: typeof item.is_lazy === "boolean" ? item.is_lazy : null,
			fetch_priority: evidenceString(item.fetch_priority, 16),
			font: item.font
				? {
						family: evidenceString(item.font.family, 120),
						weight: evidenceString(item.font.weight, 32),
						size: evidenceString(item.font.size, 32),
						url: normalizeEvidenceUrl(item.font.url),
						transfer_bytes: boundedInteger(item.font.transfer_bytes),
					}
				: null,
		})),
		render_blockers: (evidence.render_blockers || []).slice(0, 3).map((item) => ({
			url: normalizeEvidenceUrl(item.url),
			finish_time_ms: boundedInteger(item.finish_time_ms),
			fcp_delay_ms: boundedInteger(item.fcp_delay_ms),
		})),
		slow_resources: (evidence.slow_resources || []).slice(0, 5).map((item) => ({
			url: normalizeEvidenceUrl(item.url),
			type: evidenceString(item.type, 32),
			duration_ms: boundedInteger(item.duration_ms),
			transfer_bytes: boundedInteger(item.transfer_bytes),
			decoded_bytes: boundedInteger(item.decoded_bytes),
			status: boundedInteger(item.status),
			phases: boundedPhases(item.phases),
		})),
		cls_shifts: (evidence.cls_shifts || []).slice(0, 3).map((item) => ({
			target: evidenceString(item.target, 120),
			involved_elements: (item.involved_elements || []).slice(0, 5).map((element) => evidenceString(element, 120)),
			value: boundedNumber(item.value),
			viewport_ratio: boundedNumber(item.viewport_ratio),
			time_ms: boundedInteger(item.time_ms),
			load_state: evidenceString(item.load_state, 32),
			area_delta: boundedSignedNumber(item.area_delta),
			distance_moved: boundedNumber(item.distance_moved),
			dx: boundedSignedNumber(item.dx),
			dy: boundedSignedNumber(item.dy),
			previous_rect: boundedRect(item.previous_rect),
			current_rect: boundedRect(item.current_rect),
		})),
		inp: evidence.inp
			? {
					target: evidenceString(evidence.inp.target, 120),
					event_type: evidenceString(evidence.inp.event_type, 32),
					input_delay_ms: boundedInteger(evidence.inp.input_delay_ms),
					processing_ms: boundedInteger(evidence.inp.processing_ms),
					presentation_ms: boundedInteger(evidence.inp.presentation_ms),
					scripts: (evidence.inp.scripts || []).slice(0, 3).map((script) => ({
						url: normalizeEvidenceUrl(script.url),
						duration_ms: boundedInteger(script.duration_ms),
						invoker: evidenceString(script.invoker, 64),
					})),
				}
			: null,
		errors: (evidence.errors || []).slice(0, 5).map((item) => ({
			signature: evidenceString(item.signature, 120),
			source: normalizeEvidenceUrl(item.source),
			count: boundedInteger(item.count),
			first_seen_ms: boundedInteger(item.first_seen_ms),
		})),
	};
	while (new TextEncoder().encode(JSON.stringify(bounded)).byteLength > MAX_DIAGNOSTIC_EVIDENCE_BYTES) {
		const section = ["slow_resources", "lcp", "render_blockers", "cls_shifts", "errors"].find((key) => bounded[key].length > 0);
		if (!section) break;
		bounded[section].pop();
	}
	return bounded;
}


function boundedString(value, maxLength) {
	if (value === null || value === undefined) return null;
	return String(value).slice(0, maxLength);
}

function boundedInteger(value) {
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return Math.max(0, Math.round(number));
}

function boundedNumber(value, decimals = 4) {
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	const factor = 10 ** decimals;
	return Math.max(0, Math.round(number * factor) / factor);
}

function boundedSignedNumber(value, decimals = 4) {
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	const factor = 10 ** decimals;
	return Math.round(number * factor) / factor;
}

function canonicalClient(client) {
	if (!client || typeof client !== "object" || Object.keys(client).length === 0) return {};
	const deviceTypes = ["desktop", "mobile", "tablet", "unknown"];
	const browserFamilies = ["chrome", "safari", "firefox", "edge", "opera", "unknown"];
	const osFamilies = ["windows", "android", "ios", "macos", "chromeos", "linux", "unknown"];
	const effectiveTypes = ["slow-2g", "2g", "3g", "4g", "unknown"];
	const network = client.network || {};
	const rtt = boundedInteger(network.rtt_ms);
	return {
		device_type: deviceTypes.includes(client.device_type) ? client.device_type : "unknown",
		browser_family: browserFamilies.includes(client.browser_family) ? client.browser_family : "unknown",
		os_family: osFamilies.includes(client.os_family) ? client.os_family : "unknown",
		device_memory_gb: client.device_memory_gb === null || client.device_memory_gb === undefined
			? null
			: Math.min(16, boundedInteger(client.device_memory_gb)),
		language: boundedString(client.language, 32),
		network: network && Object.keys(network).length > 0
			? {
					effective_type: effectiveTypes.includes(network.effective_type) ? network.effective_type : "unknown",
					rtt_ms: rtt === null ? null : Math.min(6000, Math.round(rtt / 25) * 25),
					downlink_mbps: network.downlink_mbps === null || network.downlink_mbps === undefined
						? null
						: Math.min(1000, boundedNumber(network.downlink_mbps, 1)),
					poor_connection: network.poor_connection === true,
				}
			: null,
	};
}

function canonicalMetric(metric, cls = false) {
	if (!metric || (metric.value === undefined && metric.value_ms === undefined)) return null;
	const value = cls ? boundedNumber(metric.value, 4) : boundedInteger(metric.value_ms ?? metric.value);
	if (value === null) return null;
	const rating = ["good", "needs-improvement", "poor"].includes(metric.rating) ? metric.rating : null;
	return cls ? { value, rating } : { value_ms: value, rating };
}

function canonicalNavigation(navigation) {
	if (!navigation || typeof navigation !== "object" || Object.keys(navigation).length === 0) return {};
	const cacheStatuses = ["memory-cache", "disk-cache", "bfcache", "unknown"];
	return {
		ttfb_ms: boundedInteger(navigation.ttfb_ms),
		backend_ms: boundedInteger(navigation.backend_ms),
		dns_ms: boundedInteger(navigation.dns_ms),
		connect_ms: boundedInteger(navigation.connect_ms),
		tls_handshake_ms: boundedInteger(navigation.tls_handshake_ms),
		redirect_ms: boundedInteger(navigation.redirect_ms),
		queue_ms: boundedInteger(navigation.queue_ms),
		cache_status: cacheStatuses.includes(navigation.cache_status) ? navigation.cache_status : "unknown",
		origin_hit: navigation.origin_hit === true,
		transfer_bytes: boundedInteger(navigation.transfer_bytes),
		decoded_bytes: boundedInteger(navigation.decoded_bytes),
	};
}

function canonicalResources(resources) {
	if (!resources || typeof resources !== "object" || Object.keys(resources).length === 0) return {};
	const byType = {};
	for (const type of ["script", "img", "css", "other"]) {
		const value = resources.by_type?.[type];
		if (!value) continue;
		byType[type] = {
			count: boundedInteger(value.count),
			duration_ms: boundedInteger(value.duration_ms),
			bytes: boundedInteger(value.bytes),
		};
	}
	return {
		request_count: boundedInteger(resources.request_count),
		transfer_bytes: boundedInteger(resources.transfer_bytes),
		duration_ms: boundedInteger(resources.duration_ms),
		by_type: byType,
	};
}

export function v2ToStoragePayload(payload, context = {}) {
	const facts = payload.facts || {};
	const client = canonicalClient(facts.client);
	const navigation = canonicalNavigation(facts.navigation || {});
	const vitals = {
		fcp: canonicalMetric(facts.vitals?.fcp),
		lcp: canonicalMetric(facts.vitals?.lcp),
		cls: canonicalMetric(facts.vitals?.cls, true),
		inp: canonicalMetric(facts.vitals?.inp),
		ttfb: canonicalMetric(facts.vitals?.ttfb),
	};
	const resources = canonicalResources(facts.resources || {});
	const diagnostics = facts.diagnostics || {};
	const evidence = boundDiagnosticEvidence(payload.evidence || {});
	const resourceTypes = resources.by_type || {};
	return {
		pageview_id: payload.pageview_id,
		session_id: payload.session_id,
		domain_name: context.domain,
		current_page: normalizePagePath(payload.current_page),
		previous_page: payload.previous_page ? normalizePagePath(payload.previous_page) : null,
		referrer_domain: payload.referrer_domain ? normalizeHostname(payload.referrer_domain) : null,
		schema_version: 2,
		events: [],
		created_at: context.createdAt || new Date().toISOString(),
		country: context.geo?.country ?? null,
		region: context.geo?.region ?? null,
		city: context.geo?.city ?? null,
		provider: context.provider ?? null,
		device_type: client.device_type || null,
		browser_family: client.browser_family || null,
		os_family: client.os_family || null,
		device_memory_gb: client.device_memory_gb ?? null,
		language: client.language ?? null,
		network_effective_type: client.network?.effective_type ?? null,
		network_rtt_ms: client.network?.rtt_ms ?? null,
		network_downlink_mbps: client.network?.downlink_mbps ?? null,
		poor_connection: client.network?.poor_connection ?? null,
		backend_response_ms: navigation.backend_ms ?? null,
		dns_ms: navigation.dns_ms ?? null,
		connect_ms: navigation.connect_ms ?? null,
		tls_handshake_ms: navigation.tls_handshake_ms ?? null,
		redirect_ms: navigation.redirect_ms ?? null,
		queue_ms: navigation.queue_ms ?? null,
		cache_status: navigation.cache_status ?? null,
		origin_hit: navigation.origin_hit ?? null,
		transfer_bytes: navigation.transfer_bytes ?? null,
		decoded_bytes: navigation.decoded_bytes ?? null,
		fcp_ms: vitals.fcp?.value_ms ?? null,
		fcp_rating: vitals.fcp?.rating ?? null,
		lcp_ms: vitals.lcp?.value_ms ?? null,
		lcp_rating: vitals.lcp?.rating ?? null,
		cls_value: vitals.cls?.value ?? null,
		cls_rating: vitals.cls?.rating ?? null,
		inp_ms: vitals.inp?.value_ms ?? null,
		inp_rating: vitals.inp?.rating ?? null,
		ttfb_ms: vitals.ttfb?.value_ms ?? null,
		ttfb_rating: vitals.ttfb?.rating ?? null,
		resource_request_count: resources.request_count ?? null,
		resource_transfer_bytes: resources.transfer_bytes ?? null,
		resource_duration_ms: resources.duration_ms ?? null,
		resource_script_count: resourceTypes.script?.count ?? null,
		resource_script_bytes: resourceTypes.script?.bytes ?? null,
		resource_script_duration_ms: resourceTypes.script?.duration_ms ?? null,
		resource_image_count: resourceTypes.img?.count ?? null,
		resource_image_bytes: resourceTypes.img?.bytes ?? null,
		resource_image_duration_ms: resourceTypes.img?.duration_ms ?? null,
		resource_css_count: resourceTypes.css?.count ?? null,
		resource_css_bytes: resourceTypes.css?.bytes ?? null,
		resource_css_duration_ms: resourceTypes.css?.duration_ms ?? null,
		resource_other_count: resourceTypes.other?.count ?? null,
		resource_other_bytes: resourceTypes.other?.bytes ?? null,
		resource_other_duration_ms: resourceTypes.other?.duration_ms ?? null,
		long_task_count: diagnostics.long_task_count ?? null,
		failed_resource_count: diagnostics.failed_resource_count ?? null,
		error_count: diagnostics.error_count ?? null,
		diagnostic_evidence: evidence,
	};
}

export const RUM_CONTRACT_LIMITS = { MAX_DIAGNOSTIC_EVIDENCE_BYTES };
