import { DurableObject } from 'cloudflare:workers';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === '/collect' && request.method === 'POST') {
			if (!env.MY_DURABLE_OBJECT) {
				return new Response('Durable Object not bound', { status: 500 });
			}

			const id = env.MY_DURABLE_OBJECT.idFromName('metrics-forwarder');
			const stub = env.MY_DURABLE_OBJECT.get(id);

			// Forward request to the Durable Object
			return stub.fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	},
};

export class MyDurableObject extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.env = env;
	}

	async fetch(request) {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const data = await request.json();

			const payload = {
				session_id: data.sessionId,
				domain_name: data.siteDomain,
				current_page: data.currentPage,
				previous_page: data.previousPage,
				events: data.data,
			};

			const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rum_metrics`, {
				method: 'POST',
				headers: {
					apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
					'Content-Type': 'application/json',
					Prefer: 'return=minimal',
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				console.error(`❌ Supabase insert failed: ${res.status} ${errorText}`);
				return new Response('Error writing to Supabase', { status: 500 });
			}

			console.log('✅ Successfully inserted to Supabase');
			return new Response('Data accepted', { status: 202 });
		} catch (err) {
			console.error('❌ Invalid JSON or Supabase error:', err);
			return new Response('Invalid data', { status: 400 });
		}
	}
}
