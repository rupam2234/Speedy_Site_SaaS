import { DurableObject } from 'cloudflare:workers';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === '/collect' && request.method === 'POST') {
			if (!env.MY_DURABLE_OBJECT) {
				return new Response('Durable Object not bound', { status: 500 });
			}

			// for concurrency and load balancing we using round robin DO instances
			const shardCount = 5;
			const index = Math.floor(Math.random() * shardCount);
			const shardId = `metrics-forwarder-${index}`;
			const id = env.MY_DURABLE_OBJECT.idFromName(shardId);

			const stub = env.MY_DURABLE_OBJECT.get(id);
			return stub.fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	},
};

export class MyDurableObject extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.state = state;
		this.env = env;
	}

	async fetch(request) {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const data = await request.json();
			const domain = data.siteDomain;

			// Validate the domain
			const { valid, reason } = await this.validateDomain(domain);

			if (!valid) {
				console.log('domain validation failed');
				console.log(reason);
				return new Response(reason, { status: 403 });
			}

			// Estimate recent traffic to dynamically assign buffers
			let timestamps = await this.state.storage.get('timestamps');
			if (!Array.isArray(timestamps)) timestamps = [];
			timestamps.push(Date.now());
			if (timestamps.length > 20) timestamps.shift();
			await this.state.storage.put('timestamps', timestamps);

			const now = Date.now();
			const requestsLastMinute = timestamps.filter((t) => now - t < 60000).length;

			let bufferThreshold = 3;
			if (requestsLastMinute > 30) {
				bufferThreshold = 20;
			} else if (requestsLastMinute > 15) {
				bufferThreshold = 10;
			}

			// Load buffer
			let buffer = await this.state.storage.get('buffer');
			if (!Array.isArray(buffer)) {
				buffer = [];
			}

			// Build payload
			const payload = {
				session_id: data.sessionId,
				domain_name: data.siteDomain,
				current_page: data.currentPage,
				previous_page: data.previousPage,
				events: data.data,
			};

			buffer.push(payload);

			// If batch size reached, flush to Supabase
			if (buffer.length >= bufferThreshold) {
				const res = await this.flushToSupabase(buffer);

				if (res.ok) {
					await this.state.storage.delete('buffer');
					console.log(`Flushed ${buffer.length} to Supabase`);
					return new Response('Batch inserted to Supabase', { status: 202 });
				} else {
					await this.state.storage.put('buffer', buffer); // rollback
					return new Response('Supabase insert failed', { status: 500 });
				}
			} else {
				await this.state.storage.put('buffer', buffer);
				console.log(`Loading in buffer: ${buffer.length} with threshold: ${bufferThreshold}`);
				return new Response('Data buffered', { status: 202 });
			}
		} catch (err) {
			console.error('Invalid JSON or Supabase error:', err);
			return new Response('Invalid data', { status: 400 });
		}
	}

	async flushToSupabase(buffer) {
		try {
			const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rum_metrics`, {
				method: 'POST',
				headers: {
					apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
					'Content-Type': 'application/json',
					Prefer: 'return=minimal',
				},
				body: JSON.stringify(buffer),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error('Supabase insert failed:', res.status, errorText);
				return { ok: false, status: res.status, error: errorText };
			}

			return res;
		} catch (error) {
			console.error('Flush error:', error);
			return { ok: false };
		}
	}

	async validateDomain(domain) {
		const kvData = await this.env.SUBSCRIPTION_METADATA.get(`domain:${domain}`); //SUBSCRIPTION_METADATA

		if (!kvData) {
			return { valid: false, reason: 'Domain not found' };
		}

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
}
