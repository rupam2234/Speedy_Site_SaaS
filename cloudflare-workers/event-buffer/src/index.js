import { DurableObject } from 'cloudflare:workers';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// WebSocket Endpoint for Dashboard
		if (url.pathname === '/realtime') {
			const id = env.REALTIME_HUB.idFromName('global-hub');
			const stub = env.REALTIME_HUB.get(id);
			return stub.fetch(request);
		}

		// endpoint for data collection from collection script aka RUM
		if (url.pathname === '/collect') {
			if (!env.MY_DURABLE_OBJECT) {
				return new Response('Durable Object not bound', { status: 500 });
			}

			// shard requests across DO instances
			const shardCount = 20;
			const index = Math.floor(Math.random() * shardCount);
			const shardId = `metrics-forwarder-${index}`;
			const id = env.MY_DURABLE_OBJECT.idFromName(shardId);
			const stub = env.MY_DURABLE_OBJECT.get(id);

			return stub.fetch(request);
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
		// If it's a internal "ping" from shards
		if (request.method === 'POST') {
			const data = await request.json();
			this.broadcast(data);
			return new Response('OK');
		}

		// Dashboard connecting via WebSocket
		if (request.headers.get('Upgrade') === 'websocket') {
			const pair = new WebSocketPair();
			const [client, server] = Object.values(pair);

			// Connection limit protection
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
	}

	async fetch(request) {
		// await this.state.storage.delete('buffer'); // temp cleanup

		// Handle preflight requests
		if (request.method === 'OPTIONS') {
			const origin = request.headers.get('Origin') || '';
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': origin,
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Allow-Credentials': 'true',
					'Access-Control-Max-Age': '86400', // cached to reduce preflight requests / CORS checks
				},
			});
		}

		if (request.method !== 'POST') {
			return corsResponse('Method Not Allowed', request, 405);
		}

		try {
			const data = await request.json();
			const domain = data.siteDomain;

			/* ----------------------------
			   DOMAIN VALIDATION
			-----------------------------*/

			const { valid, reason } = await this.validateDomain(domain);

			if (!valid) {
				return corsResponse(reason, request, 403);
			}

			/* ----------------------------
			   REQUEST RATE TRACKING
			-----------------------------*/

			// let timestamps = await this.state.storage.get('timestamps');

			// if (!Array.isArray(timestamps)) timestamps = [];

			const now = Date.now();
			this.recentTimestamps.push(now);

			// Only keep timestamps from the last 60 seconds
			const oneMinuteAgo = now - 60000;
			this.recentTimestamps = this.recentTimestamps.filter((t) => t > oneMinuteAgo);

			const requestsLastMinute = this.recentTimestamps.length;
			/* ----------------------------
			   GEO DATA FROM CLOUDFLARE
			-----------------------------*/

			const cf = request.cf ?? {};

			const geo = {
				country: cf.country ?? null,
				region: cf.region ?? null,
				city: cf.city ?? null,
				timezone: cf.timezone ?? null,
				continent: cf.continent ?? null,
				org: cf.asOrganization ?? null,
			};

			// Notify the BroadcastHub (Only send 10% of traffic to the map)

			const chance = requestsLastMinute > 30 ? 0.05 : requestsLastMinute > 15 ? 0.1 : 1;

			const events = data.data ?? [];

			const realtimeData = {}; // we vitals data for web socket

			events.forEach((event) => {
				if (event.type === 'web-vital') {
					switch (event.name) {
						case 'LCP':
							realtimeData.LCP = event.value || null;
							break;
						case 'CLS':
							realtimeData.CLS = event.value || null;
							break;
						case 'INP':
							realtimeData.INP = event.value || null;
							break;
						case 'TTFB':
							realtimeData.TTFB = event.value || null;
							break;
					}
				} else if (event.type === 'client-info') {
					realtimeData.device = event.deviceType || null;
				}

				// fallback device
				if (!realtimeData.device) {
					realtimeData.device = 'unknown';
				}
			});

			if (Math.random() < chance) {
				this.sendToHub({
					type: 'visitor',
					domain: domain,
					session: data.sessionId,
					currentPage: data.currentPage,
					previousPage: data.previousPage,
					// sending longitude, latitude only for realtime tracking, not storing them in db
					...{ ...geo, latitude: cf.latitude ?? null, longitude: cf.longitude ?? null },
					...realtimeData,
					timestamp: Date.now(),
				});
			}

			/* ----------------------------
			NORMALIZED PAYLOAD
			-----------------------------*/

			// add geo-info event
			const geoEvent = {
				type: 'geo-info',
				...geo,
				timestamp: Date.now(),
				siteDomain: data.siteDomain ?? null,
			};

			events.unshift(geoEvent);

			// Optimize navigation timings
			const optimizedEvents = events.map((event) => {
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

			const payload = {
				session_id: data.sessionId ?? null,
				domain_name: data.siteDomain ?? null,
				current_page: data.currentPage ?? null,
				previous_page: data.previousPage ?? null,
				events: optimizedEvents,
				created_at: new Date().toISOString(),
			};

			/* ----------------------------
			SAFE BUFFER WRITE
			-----------------------------*/

			let bufferThreshold = 3;

			if (requestsLastMinute > 30) bufferThreshold = 20;
			else if (requestsLastMinute > 15) bufferThreshold = 10;

			let buffer;
			let shouldFlush = false;

			await this.state.storage.transaction(async (txn) => {
				buffer = await txn.get('buffer');

				if (!Array.isArray(buffer)) buffer = [];

				buffer.push(payload);

				const approxSize = buffer.length * 2000;

				shouldFlush = buffer.length >= bufferThreshold || approxSize > 400000;

				if (!shouldFlush) {
					await txn.put('buffer', buffer);
				}
			});

			if (!shouldFlush) {
				return corsResponse('Data buffered', request, 202);
			}

			/* ----------------------------
			   FLUSH TO SUPABASE
			-----------------------------*/

			const res = await this.flushToSupabase(buffer);

			if (res.ok) {
				await this.state.storage.delete('buffer');
				return corsResponse('Batch inserted', request, 202);
			}

			await this.state.storage.put('buffer', buffer);
			return corsResponse('Supabase insert failed', request, 500);
		} catch (err) {
			console.error('Handler error:', err);
			return corsResponse('Invalid data', request, 400);
		}
	}

	// SUPABASE BATCH INSERT
	async flushToSupabase(buffer) {
		try {
			// SANITIZE: Forcing every object to have the exact same keys
			const cleanBuffer = buffer.map((item) => ({
				session_id: item.session_id ?? null,
				domain_name: item.domain_name ?? null,
				current_page: item.current_page ?? null,
				previous_page: item.previous_page ?? null,
				events: item.events ?? [],
				created_at: item.created_at ?? new Date().toISOString(),
			}));

			const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rum_metrics`, {
				method: 'POST',
				headers: {
					apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
					'Content-Type': 'application/json',
					Prefer: 'return=minimal',
				},
				body: JSON.stringify(cleanBuffer),
			});

			if (!res.ok) {
				const errorText = await res.text();

				console.error('Supabase insert failed:', res.status, errorText);

				return { ok: false };
			}

			return { ok: true };
		} catch (err) {
			console.error('Supabase flush exception:', err);

			return { ok: false };
		}
	}

	async validateDomain(domain) {
		const kvData = await this.env.SUBSCRIPTION_METADATA.get(`domain:${domain}`);

		if (!kvData) return { valid: false, reason: 'Domain not found' };

		let subscription;

		try {
			subscription = JSON.parse(kvData);
		} catch {
			return { valid: false, reason: 'Invalid subscription data' };
		}

		if (subscription.status !== 'active') {
			return { valid: false, reason: 'Subscription inactive' };
		}

		const now = new Date();
		const start = new Date(subscription.period_starts_at);
		const end = new Date(subscription.period_ends_at);

		if (now < start || now > end) {
			return { valid: false, reason: 'Subscription expired' };
		}

		const usage = subscription.current_usage ?? 0;
		const limit = subscription.usage_limit ?? 0;

		if (subscription.degradation_policy === 'block' && usage >= limit) {
			return { valid: false, reason: 'Usage limit exceeded' };
		}

		return { valid: true };
	}

	// Helper to send data to the central hub
	sendToHub(payload) {
		const id = this.env.REALTIME_HUB.idFromName('global-hub');
		const hub = this.env.REALTIME_HUB.get(id);
		// Fire and forget
		this.state.waitUntil(
			hub.fetch('http://hub/broadcast', {
				method: 'POST',
				body: JSON.stringify({
					...payload,
					id: (payload.session_id || 'anon') + Date.now(),
				}),
			}),
		);
	}
}

function corsResponse(body, request, status = 200) {
	const origin = request.headers.get('Origin') || '';
	return new Response(body, {
		status,
		headers: {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Credentials': 'true',
		},
	});
}
