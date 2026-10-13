const WORKER_BASE_URLS = {
	metrics: "https://analytics-cron.thespeedysite.workers.dev",
	trafficSource: "https://traffic-source-cron.thespeedysite.workers.dev",
} as const;

type AnalyticsWorker = keyof typeof WORKER_BASE_URLS;

// Server-side only: forwards analytics reads to a worker with the secret
// header and caches each response in the Next.js data cache for 1 hour
export async function fetchFromAnalyticsWorker(
	worker: AnalyticsWorker,
	path: string,
	params: Record<string, string | undefined>,
) {
	const secret = process.env.ANALYTICS_API_SECRET;
	if (!secret) {
		throw new Error("ANALYTICS_API_SECRET is not configured");
	}

	const url = new URL(path, WORKER_BASE_URLS[worker]);
	for (const [name, value] of Object.entries(params)) {
		if (value !== undefined) url.searchParams.set(name, value);
	}

	const res = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${secret}` },
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		throw new Error(`Analytics worker request failed: ${res.status}`);
	}

	return res.json();
}
