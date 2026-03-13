import { DurableObject } from 'cloudflare:workers';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// WebSocket Endpoint for  Dashboard
		if(url.pathname === "/realtime"){
			const id = env.REALTIME_HUB.idFromName('global-hub');
			const stub = env.REALTIME_HUB.get(id);
			return stub.fetch(request);
		}

		// endpoint for data collection from collection script aka RUM
		if (url.pathname === '/collect' && request.method === 'POST') {
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
	constructor(state, env){
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
				server.close(1013, "Too many connections");
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

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {

			const data = await request.json();
			const domain = data.siteDomain;

			/* ----------------------------
			   DOMAIN VALIDATION
			-----------------------------*/

			const { valid, reason } = await this.validateDomain(domain);

			if (!valid) {
				return new Response(reason, { status: 403 });
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
			this.recentTimestamps = this.recentTimestamps.filter(t => t > oneMinuteAgo);

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
				org: cf.asOrganization ?? null
			};

			// Notify the BroadcastHub (Only send 10% of traffic to the map)

			const chance = requestsLastMinute > 30 
			? 0.05 
			: requestsLastMinute > 15 
				? 0.1 
				: 1;

			const events = data.data ?? [];

			const realTimeVitalsData = {}; // we vitals data for web socket 

			events.forEach((event) => {
				if (event.type === "web-vital") {
				switch (event.name) {
					case "LCP":
					realTimeVitalsData.LCP = event.value || null;
					break;
					case "CLS":
					realTimeVitalsData.CLS = event.value || null;
					break;
					case "INP":
					realTimeVitalsData.INP = event.value || null;
					break;
					case "TTFB":
					realTimeVitalsData.TTFB = event.value || null;
					break;
				}
				}
			});

			if (Math.random() < chance) {  
				this.sendToHub({
					type: 'visitor',
					domain: domain,
					// sending longitude, latitude only for realtime tracking, not storing them in db
					...{...geo, latitude: cf.latitude ?? null,
						longitude: cf.longitude ?? null},
					...realTimeVitalsData,
					timestamp: Date.now()
				});
			 }
			
			/* ----------------------------
			NORMALIZED PAYLOAD
			-----------------------------*/

			// add geo-info event
			const geoEvent = {
				type: "geo-info",
				...geo,
				timestamp: Date.now(),
				siteDomain: data.siteDomain ?? null
			};

			events.unshift(geoEvent);

			// Optimize navigation timings
			const optimizedEvents = events.map((event) => {
				if (event.type === "navigation-timing" && event.raw) {
					const r = event.raw;
					const safe = (v) => (typeof v === "number" && v >= 0 ? v : null);

					return {
						...event,
						raw: {
							ttfb: safe(r.responseStart - r.requestStart),
							domReady: safe(r.domInteractive - r.startTime),
							loadTime: safe(r.loadEventEnd - r.startTime)
						}
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
				created_at: new Date().toISOString()
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

				shouldFlush =
					buffer.length >= bufferThreshold ||
					approxSize > 400000;

				if (!shouldFlush) {
					await txn.put('buffer', buffer);
				}

			});

			if (!shouldFlush) {
				return new Response('Data buffered', { status: 202 });
			}

			/* ----------------------------
			   FLUSH TO SUPABASE
			-----------------------------*/

			const res = await this.flushToSupabase(buffer);

			if (res.ok) {

				await this.state.storage.delete('buffer');

				return new Response('Batch inserted', { status: 202 });
			}

			await this.state.storage.put('buffer', buffer);

			return new Response('Supabase insert failed', { status: 500 });

		} catch (err) {

			console.error('Handler error:', err);

			return new Response('Invalid data', { status: 400 });
		}
	}

	/* ----------------------------
	   SUPABASE BATCH INSERT
	-----------------------------*/

	async flushToSupabase(buffer) {

		try {

			// SANITIZE: Forcing every object to have the exact same keys
			const cleanBuffer = buffer.map(item => ({
				session_id: item.session_id ?? null,
				domain_name: item.domain_name ?? null,
				current_page: item.current_page ?? null,
				previous_page: item.previous_page ?? null,
				events: item.events ?? [],
				created_at: item.created_at ?? new Date().toISOString()
			}));

			const res = await fetch(
				`${this.env.SUPABASE_URL}/rest/v1/rum_metrics`,
				{
					method: 'POST',
					headers: {
						apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
						'Content-Type': 'application/json',
						Prefer: 'return=minimal'
					},
					body: JSON.stringify(cleanBuffer)
				}
			);

			if (!res.ok) {

				const errorText = await res.text();

				console.error(
					'Supabase insert failed:',
					res.status,
					errorText
				);

				return { ok: false };
			}

			return { ok: true };

		} catch (err) {

			console.error('Supabase flush exception:', err);

			return { ok: false };
		}
	}

	/* ----------------------------
	   DOMAIN VALIDATION
	-----------------------------*/

	async validateDomain(domain) {

		const kvData =
			await this.env.SUBSCRIPTION_METADATA.get(`domain:${domain}`);

		if (!kvData)
			return { valid: false, reason: 'Domain not found' };

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

		if (
			subscription.degradation_policy === 'block' &&
			usage >= limit
		) {
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
				body: JSON.stringify(payload)
			})
		);
	}
}

// backup

// import { DurableObject } from 'cloudflare:workers';

// export default {
// 	async fetch(request, env) {
// 		const url = new URL(request.url);

// 		if (url.pathname === '/collect' && request.method === 'POST') {
// 			if (!env.MY_DURABLE_OBJECT) {
// 				return new Response('Durable Object not bound', { status: 500 });
// 			}

// 			// Round-robin sharding
// 			const shardCount = 20;
// 			const index = Math.floor(Math.random() * shardCount);
// 			const shardId = `metrics-forwarder-${index}`;
// 			const id = env.MY_DURABLE_OBJECT.idFromName(shardId);
// 			const stub = env.MY_DURABLE_OBJECT.get(id);

// 			return stub.fetch(request);
// 		}

// 		return new Response('Not Found', { status: 404 });
// 	},
// };

// export class MyDurableObject extends DurableObject {
// 	constructor(state, env) {
// 		super(state, env);
// 		this.state = state;
// 		this.env = env;
// 	}

// 	async fetch(request) {
// 		// temporary clear of post data
// 		// await this.state.storage.delete('buffer');
// 		// await this.state.storage.delete('timestamps');

// 		if (request.method !== 'POST') {
// 			return new Response('Method Not Allowed', { status: 405 });
// 		}

// 		try {
// 			const data = await request.json();
// 			const domain = data.siteDomain;

// 			// Validate domain
// 			const { valid, reason } = await this.validateDomain(domain);
// 			if (!valid) {
// 				return new Response(reason, { status: 403 });
// 			}

// 			// Track recent request timestamps
// 			let timestamps = await this.state.storage.get('timestamps');
// 			if (!Array.isArray(timestamps)) timestamps = [];
// 			timestamps.push(Date.now());
// 			if (timestamps.length > 20) timestamps.shift();
// 			await this.state.storage.put('timestamps', timestamps);

// 			const now = Date.now();
// 			const requestsLastMinute = timestamps.filter((t) => now - t < 60000).length;

// 			let bufferThreshold = 3;
// 			if (requestsLastMinute > 30) bufferThreshold = 20;
// 			else if (requestsLastMinute > 15) bufferThreshold = 10;

// 			// Load buffer
// 			let buffer = await this.state.storage.get('buffer');
// 			if (!Array.isArray(buffer)) buffer = [];

// 			// Normalized payload (NO undefined keys)
// 			const payload = {
// 				session_id: data.sessionId ?? null,
// 				domain_name: data.siteDomain ?? null,
// 				current_page: data.currentPage ?? null,
// 				previous_page: data.previousPage ?? null,
// 				events: data.data ?? [],
// 				created_at: new Date().toISOString(),
// 			};

// 			// before sending data into buffer we can calculate the navigation timings (reduces bandwidth, saves space)
// 			payload.events = payload.events.map((event)=> {
// 				if(event.type === "navigation-timing" && event.raw){
// 					const r = event.raw;

// 					const safe = (v) =>
// 						typeof v === "number" && v >= 0 ? v : null;

// 					// Compute derived timings
// 					const ttfb = safe(r.responseStart - r.requestStart);
// 					const domReady = safe(r.domInteractive - r.startTime);
// 					const loadTime = safe(r.loadEventEnd - r.startTime);

// 					return {
// 						...event,
// 						raw: {
// 							ttfb,
// 							domReady,
// 							loadTime
// 						}
// 					}
// 				}

// 				return event;
// 			})

// 			buffer.push(payload);

// 			// Decide whether to flush
// 			const shouldFlush = buffer.length >= bufferThreshold || JSON.stringify(buffer).length > 400_000;

// 			if (!shouldFlush) {
// 				await this.state.storage.put('buffer', buffer);
// 				return new Response('Data buffered', { status: 202 });
// 			}

// 			// Flush ONCE
// 			const res = await this.flushToSupabase(buffer);

// 			if (res.ok) {
// 				await this.state.storage.delete('buffer');
// 				return new Response('Batch inserted to Supabase', { status: 202 });
// 			}

// 			// Failure → keep buffer
// 			await this.state.storage.put('buffer', buffer);
// 			return new Response('Supabase insert failed', { status: 500 });
// 		} catch (err) {
// 			console.error('Handler error:', err);
// 			return new Response('Invalid data', { status: 400 });
// 		}
// 	}

// 	async flushToSupabase(buffer) {
// 		try {
// 			const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rum_metrics`, {
// 				method: 'POST',
// 				headers: {
// 					apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
// 					Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
// 					'Content-Type': 'application/json',
// 					Prefer: 'return=minimal',
// 				},
// 				body: JSON.stringify(buffer),
// 			});

// 			if (!res.ok) {
// 				const errorText = await res.text();
// 				console.error('Supabase insert failed:', res.status, errorText);
// 				return { ok: false };
// 			}

// 			return res;
// 		} catch (err) {
// 			console.error('Supabase flush exception:', err);
// 			return { ok: false };
// 		}
// 	}

// 	async validateDomain(domain) {
// 		const kvData = await this.env.SUBSCRIPTION_METADATA.get(`domain:${domain}`);
// 		if (!kvData) return { valid: false, reason: 'Domain not found' };

// 		let subscription;
// 		try {
// 			subscription = JSON.parse(kvData);
// 		} catch {
// 			return { valid: false, reason: 'Invalid subscription data' };
// 		}

// 		if (subscription.status !== 'active') {
// 			return { valid: false, reason: 'Subscription inactive' };
// 		}

// 		const now = new Date();
// 		const start = new Date(subscription.period_starts_at);
// 		const end = new Date(subscription.period_ends_at);
// 		if (now < start || now > end) {
// 			return { valid: false, reason: 'Subscription expired' };
// 		}

// 		const usage = subscription.current_usage ?? 0;
// 		const limit = subscription.usage_limit ?? 0;
// 		if (subscription.degradation_policy === 'block' && usage >= limit) {
// 			return { valid: false, reason: 'Usage limit exceeded' };
// 		}

// 		return { valid: true };
// 	}
// }