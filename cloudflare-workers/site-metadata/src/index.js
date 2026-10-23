const PAID_SERVICE_TYPES = new Set(['managed_wp']);
const KEY_PREFIX = 'domain:';

// Applied identically on the event-buffer side of the gate
function normalizeDomain(value) {
	return (value || '').trim().toLowerCase().replace(/^www\./, '');
}

async function fetchEntitlements(env) {
	const url = `${env.SUPABASE_URL}/rest/v1/user_services?select=id,website_name,service_type,status,expires_at,metadata&status=eq.active`;
	const res = await fetch(url, {
		headers: {
			apikey: env.SUPABASE_SERVICE_ROLE_KEY,
			Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
		},
	});
	if (!res.ok) {
		throw new Error(`Supabase query failed: ${res.status} ${await res.text()}`);
	}
	return res.json();
}

// Only slow-changing fields go into the KV value: keeps daily writes tiny
function toKvValue(service) {
	return JSON.stringify({
		serviceId: service.id,
		status: service.status,
		expiresAt: service.expires_at ?? null,
		pageviewLimit: service.metadata?.rum_pageview_limit ?? null,
	});
}

function buildDesiredMap(services) {
	const desired = new Map();
	const now = Date.now();
	for (const service of services) {
		const domain = normalizeDomain(service.website_name);
		if (!PAID_SERVICE_TYPES.has(service.service_type) || !domain) continue;
		const expires = service.expires_at ? Date.parse(service.expires_at) : NaN;
		if (!Number.isNaN(expires) && expires <= now) continue;
		desired.set(domain, toKvValue(service));
	}
	return desired;
}

export async function sync(env) {
	const desired = buildDesiredMap(await fetchEntitlements(env));

	let writes = 0;
	let deletes = 0;
	let unchanged = 0;

	// Reconcile against what is already in KV: stale keys are deleted here
	let listed = [];
	let cursor;
	do {
		const page = await env.SITE_METADATA.list({ prefix: KEY_PREFIX, cursor });
		listed = listed.concat(page.keys);
		cursor = page.list_complete ? undefined : page.cursor;
	} while (cursor);

	for (const key of listed) {
		const domain = key.name.slice(KEY_PREFIX.length);
		if (desired.has(domain)) {
			const next = desired.get(domain);
			const current = await env.SITE_METADATA.get(key.name);
			if (current !== next) {
				await env.SITE_METADATA.put(key.name, next);
				writes++;
			} else {
				unchanged++;
			}
			desired.delete(domain);
		} else {
			await env.SITE_METADATA.delete(key.name);
			deletes++;
		}
	}

	for (const [domain, value] of desired) {
		await env.SITE_METADATA.put(`${KEY_PREFIX}${domain}`, value);
		writes++;
	}

	return { entitled: writes + unchanged, writes, deletes, unchanged };
}

export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(
			sync(env).catch((err) => console.error('site-metadata sync failed:', err.message)),
		);
	},

	async fetch(request, env) {
		if (!env.CRON_SECRET) {
			return new Response('CRON_SECRET not configured', { status: 500 });
		}
		const authHeader = request.headers.get('Authorization') || '';
		if (request.method !== 'POST' || authHeader !== `Bearer ${env.CRON_SECRET}`) {
			return new Response('Unauthorized', { status: 401 });
		}
		const summary = await sync(env);
		return Response.json(summary);
	},
};
