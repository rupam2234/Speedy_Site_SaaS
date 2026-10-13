import { DurableObject } from 'cloudflare:workers';

const MAX_BODY_BYTES = 65536;
const MAX_EVENTS_PER_REQUEST = 200;
const SHARD_NAME_PREFIX = 'metrics-forwarder-';
const BROADCAST_MIN_INTERVAL_MS = 10000;
const ALARM_FLUSH_DELAY_MS = 30000;
const ALARM_RETRY_DELAY_MS = 300000;

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// WebSocket endpoint for the dashboard realtime map
		if (url.pathname === '/realtime') {
			const id = env.REALTIME_HUB.idFromName('global-hub');
			return env.REALTIME_HUB.get(id).fetch(request);
		}

		// RUM collector ingestion, sharded across DO instances
		if (url.pathname === '/collect') {
			const shardCount = Number(env.SHARD_COUNT || 4);
			const index = Math.floor(Math.random() * shardCount);
			const id = env.MY_DURABLE_OBJECT.idFromName(`${SHARD_NAME_PREFIX}${index}`);
			return env.MY_DURABLE_OBJECT.get(id).fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	},
};

export class RealtimeHub extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.sessions = new Set();
	}

	async fetch(request) {
		if (request.method === 'POST') {
			this.broadcast(await request.json());
			return new Response('OK');
		}

		if (request.headers.get('Upgrade') === 'websocket') {
			const pair = new WebSocketPair();
			const [client, server] = Object.values(pair);

			if (this.sessions.size >= 2000) {
				server.close(1013, 'Too many connections');
				return new Response(null, { status: 101, webSocket: client });
			}

			server.accept();
			this.sessions.add(server);
			const cleanup = () => this.sessions.delete(server);
			server.addEventListener('close', cleanup);
			server.addEventListener('error', cleanup);

			return new Response(null, { status: 101, webSocket: client });
		}

		return new Response('Expected Upgrade: websocket', { status: 426 });
	}

	broadcast(data) {
		const message = JSON.stringify(data);
		for (const session of this.sessions) {
			try {
				if (session.readyState === 1) {
					session.send(message);
				} else {
					this.sessions.delete(session);
				}
			} catch {
				this.sessions.delete(session);
			}
		}
	}
}

export class MyDurableObject extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.state = state;
		this.env = env;
		this.recentTimestamps = [];
		this.lastBroadcastAt = 0;
	}

	async fetch(request) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders(request) });
		}

		if (request.method !== 'POST') {
			return corsResponse('Method Not Allowed', request, 405);
		}

		// 64KB matches the browser beacon limit; larger bodies are malformed or abusive
		const contentLength = Number(request.headers.get('Content-Length') || 0);
		if (contentLength > MAX_BODY_BYTES) {
			return corsResponse('Payload too large', request, 413);
		}

		try {
			const data = await request.json();

			// Identity comes from the request itself, never from the payload
			const domain = normalizeDomain(originHost(request));
			const { valid, reason } = await this.validateDomain(domain);
			if (!valid) {
				return corsResponse(reason, request, 403);
			}

			const events = Array.isArray(data.data) ? data.data.slice(0, MAX_EVENTS_PER_REQUEST) : [];
			const now = Date.now();
			this.recentTimestamps.push(now);
			this.recentTimestamps = this.recentTimestamps.filter((t) => t > now - 60000);
			const requestsLastMinute = this.recentTimestamps.length;

			const geo = buildGeo(request.cf);
			this.broadcastSampled(data, domain, geo, realtimeExtract(events), requestsLastMinute, request.cf, now);

			return this.bufferOrFlush(buildPayload(data, events, domain, geo), request, requestsLastMinute);
		} catch (err) {
			console.error('Handler error:', err);
			return corsResponse('Invalid data', request, 400);
		}
	}

	// Time-based flush: drains partial buffers that low traffic would starve
	async alarm() {
		const buffer = await this.state.storage.get('buffer');
		if (!Array.isArray(buffer) || buffer.length === 0) return;

		const res = await this.flushToSupabase(buffer);
		if (res.ok) {
			await this.state.storage.delete('buffer');
			return;
		}
		await this.state.storage.setAlarm(Date.now() + ALARM_RETRY_DELAY_MS);
	}

	async bufferOrFlush(payload, request, requestsLastMinute) {
		const threshold = requestsLastMinute > 30 ? 20 : requestsLastMinute > 15 ? 10 : 3;

		let buffer;
		let shouldFlush = false;

		await this.state.storage.transaction(async (txn) => {
			buffer = await txn.get('buffer');
			if (!Array.isArray(buffer)) buffer = [];
			buffer.push(payload);
			const approxSize = buffer.reduce((sum, item) => sum + JSON.stringify(item).length, 0);
			shouldFlush = buffer.length >= threshold || approxSize > 400000;
			if (!shouldFlush) {
				await txn.put('buffer', buffer);
			}
		});

		if (!shouldFlush) {
			const alarm = await this.state.storage.getAlarm();
			if (alarm === null) {
				await this.state.storage.setAlarm(Date.now() + ALARM_FLUSH_DELAY_MS);
			}
			return corsResponse('Data buffered', request, 202);
		}

		const res = await this.flushToSupabase(buffer);
		if (res.ok) {
			await this.state.storage.delete('buffer');
			return corsResponse('Batch inserted', request, 202);
		}

		await this.state.storage.put('buffer', buffer);
		await this.state.storage.setAlarm(Date.now() + ALARM_RETRY_DELAY_MS);
		return corsResponse('Supabase insert failed', request, 500);
	}

	async flushToSupabase(buffer) {
		try {
			const cleanBuffer = buffer.map((item) => ({
				pageview_id: item.pageview_id ?? null,
				session_id: item.session_id ?? null,
				domain_name: item.domain_name ?? null,
				current_page: item.current_page ?? null,
				previous_page: item.previous_page ?? null,
				events: item.events ?? [],
				created_at: item.created_at ?? new Date().toISOString(),
			}));

			const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/upsert_rum_metrics_batch`, {
				method: 'POST',
				headers: {
					apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ payloads: cleanBuffer }),
			});

			if (!res.ok) {
				console.error('Supabase upsert failed:', res.status, await res.text());
				return { ok: false };
			}
			return { ok: true };
		} catch (err) {
			console.error('Supabase flush exception:', err);
			return { ok: false };
		}
	}

	async validateDomain(domain) {
		if (!domain) return { valid: false, reason: 'Origin missing' };

		const kvData = await this.env.SITE_METADATA.get(`domain:${domain}`);
		if (!kvData) return { valid: false, reason: 'Domain not found' };

		let service;
		try {
			service = JSON.parse(kvData);
		} catch {
			return { valid: false, reason: 'Invalid service data' };
		}

		if (service.status !== 'active') {
			return { valid: false, reason: 'Service inactive' };
		}

		// Dual expiry enforcement: the cron also removes expired keys
		if (service.expiresAt && new Date(service.expiresAt).getTime() <= Date.now()) {
			return { valid: false, reason: 'Service expired' };
		}

		return { valid: true };
	}

	// Realtime map feed: sampled by load and rate capped so quiet shards stay quiet
	broadcastSampled(data, domain, geo, realtimeData, requestsLastMinute, cf, now) {
		const chance = requestsLastMinute > 30 ? 0.05 : requestsLastMinute > 15 ? 0.1 : 1;
		if (Math.random() >= chance) return;
		if (now - this.lastBroadcastAt < BROADCAST_MIN_INTERVAL_MS) return;
		this.lastBroadcastAt = now;

		const hub = this.env.REALTIME_HUB.get(this.env.REALTIME_HUB.idFromName('global-hub'));
		this.state.waitUntil(
			hub.fetch('http://hub/broadcast', {
				method: 'POST',
				body: JSON.stringify({
					type: 'visitor',
					id: (data.sessionId || 'anon') + now,
					domain,
					session: data.sessionId,
					currentPage: data.currentPage,
					previousPage: data.previousPage,
					...geo,
					latitude: cf.latitude ?? null,
					longitude: cf.longitude ?? null,
					...realtimeData,
					timestamp: now,
				}),
			}),
		);
	}
}

function originHost(request) {
	const origin = request.headers.get('Origin');
	if (origin) return new URL(origin).hostname;
	const referer = request.headers.get('Referer');
	if (referer) return new URL(referer).hostname;
	return '';
}

function normalizeDomain(value) {
	return (value || '').trim().toLowerCase().replace(/^www\./, '');
}

function buildGeo(cf) {
	const source = cf ?? {};
	return {
		country: source.country ?? null,
		region: source.region ?? null,
		city: source.city ?? null,
		timezone: source.timezone ?? null,
		continent: source.continent ?? null,
		org: source.asOrganization ?? null,
	};
}

function realtimeExtract(events) {
	const realtimeData = { device: 'unknown' };
	for (const event of events) {
		if (event.type === 'web-vital' && ['LCP', 'CLS', 'INP', 'TTFB'].includes(event.name)) {
			realtimeData[event.name] = event.value || null;
		} else if (event.type === 'client-info' && event.deviceType) {
			realtimeData.device = event.deviceType;
		}
	}
	return realtimeData;
}

function buildPayload(data, events, domain, geo) {
	const enriched = [
		{ type: 'geo-info', ...geo, timestamp: Date.now(), siteDomain: domain },
		...events,
	];

	const optimized = enriched.map((event) => {
		if (event.type === 'navigation-timing' && event.raw) {
			const r = event.raw;
			const safe = (v) => (typeof v === 'number' && v >= 0 ? v : null);
			return {
				...event,
				raw: {
					ttfb: safe(r.responseStart - r.requestStart),
					domReady: safe(r.domInteractive - r.startTime),
					loadTime: safe(r.loadEventEnd - r.startTime),
				},
			};
		}
		return event;
	});

	return {
		pageview_id: data.pageview_id ?? null,
		session_id: data.sessionId ?? null,
		domain_name: domain,
		current_page: data.currentPage ?? null,
		previous_page: data.previousPage ?? null,
		events: optimized,
		created_at: new Date().toISOString(),
	};
}

function corsHeaders(request) {
	return {
		'Access-Control-Allow-Origin': request.headers.get('Origin') || '',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}

function corsResponse(body, request, status = 200) {
	return new Response(body, { status, headers: corsHeaders(request) });
}