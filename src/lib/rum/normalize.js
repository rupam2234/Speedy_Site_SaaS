export function normalizeHostname(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/^www\./, "");
}

export function normalizeReferrerDomain(referrer, currentHostname) {
	if (!referrer) return null;
	try {
		const url = new URL(referrer);
		const hostname = normalizeHostname(url.hostname);
		if (!hostname || hostname === normalizeHostname(currentHostname)) return null;
		return hostname;
	} catch {
		return null;
	}
}

export function normalizePagePath(value) {
	if (!value) return null;
	try {
		const url = new URL(value, "https://local.invalid");
		return url.pathname || "/";
	} catch {
		return null;
	}
}

export function normalizeEvidenceUrl(value, baseUrl) {
	if (!value) return null;
	try {
		const url = new URL(value, baseUrl || "https://local.invalid");
		url.username = "";
		url.password = "";
		url.hash = "";
		url.search = "";
		const normalized = `${url.pathname}${url.search}`;
		return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
	} catch {
		return null;
	}
}

export function classifyDevice(input = {}) {
	const userAgent = String(input.userAgent || "");
	const userAgentData = input.userAgentData || {};
	const maxTouchPoints = Number(input.maxTouchPoints || 0);
	const viewportWidth = Number(input.viewportWidth || 0);

	if (userAgentData.mobile === true || /Mobile|Android.*Mobile|IEMobile/i.test(userAgent)) {
		return "mobile";
	}
	if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent) || (maxTouchPoints > 1 && viewportWidth >= 600)) {
		return "tablet";
	}
	if (maxTouchPoints > 0 && viewportWidth > 0 && viewportWidth < 600) return "mobile";
	if (viewportWidth > 0 && viewportWidth <= 768) return "mobile";
	if (viewportWidth > 768 && viewportWidth <= 1024) return "tablet";
	return "desktop";
}

export function parseBrowserFamily(userAgent) {
	const value = String(userAgent || "");
	if (/Edg\//i.test(value)) return "edge";
	if (/OPR\/|Opera/i.test(value)) return "opera";
	if (/Firefox\//i.test(value)) return "firefox";
	if (/Chrome\//i.test(value)) return "chrome";
	if (/Safari\//i.test(value)) return "safari";
	return "unknown";
}

export function parseOsFamily(userAgent) {
	const value = String(userAgent || "");
	if (/Windows/i.test(value)) return "windows";
	if (/Android/i.test(value)) return "android";
	if (/iPhone|iPad|iPod/i.test(value)) return "ios";
	if (/Mac OS X|Macintosh/i.test(value)) return "macos";
	if (/CrOS/i.test(value)) return "chromeos";
	if (/Linux/i.test(value)) return "linux";
	return "unknown";
}

export function normalizeNetwork(connection) {
	if (!connection || typeof connection !== "object") return null;
	const effectiveType = ["slow-2g", "2g", "3g", "4g"].includes(connection.effectiveType)
		? connection.effectiveType
		: "unknown";
	const rtt = Number(connection.rtt);
	const downlink = Number(connection.downlink);
	const roundedRtt = Number.isFinite(rtt) ? Math.min(6000, Math.max(0, Math.round(rtt / 25) * 25)) : null;
	const roundedDownlink = Number.isFinite(downlink) ? Math.min(1000, Math.max(0, Math.round(downlink * 10) / 10)) : null;
	return {
		effective_type: effectiveType,
		rtt_ms: roundedRtt,
		downlink_mbps: roundedDownlink,
		poor_connection: effectiveType === "slow-2g" || effectiveType === "2g" || (roundedRtt !== null && roundedRtt >= 500),
	};
}

export function finiteNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

export function nonNegativeInteger(value) {
	const number = finiteNumber(value);
	return number === null ? null : Math.max(0, Math.round(number));
}

export function normalizeRating(value) {
	const rating = String(value || "").toLowerCase().replace(/[\s_]+/g, "-");
	if (["good", "needs-improvement", "poor"].includes(rating)) return rating;
	return null;
}
