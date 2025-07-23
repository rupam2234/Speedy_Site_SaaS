import { DurableObject } from 'cloudflare:workers';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === '/collect') {
			if (!env.MY_DURABLE_OBJECT) {
				return new Response('Durable Object not bound', { status: 500 });
			}

			const id = env.MY_DURABLE_OBJECT.idFromName('metrics-buffer');
			const stub = env.MY_DURABLE_OBJECT.get(id);

			// forward the request to the Durable Object
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
		this.alarmScheduled = false;
	}

	async fetch(request) {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const data = await request.json();
			const timestamp = Date.now();

			// Store the event temporarily under a timestamp key
			await this.state.storage.put(`event:${timestamp}`, data);

			// Schedule an alarm if not already set
			if (!this.alarmScheduled) {
				await this.state.storage.setAlarm(Date.now() + 30_000); // 30 seconds
				this.alarmScheduled = true;
			}

			return new Response('Data accepted', { status: 202 });
		} catch (error) {
			console.error('Invalid JSON:', error);
			return new Response('Invalid JSON', { status: 400 });
		}
	}

	async alarm() {
		console.log('⏰ Alarm triggered: flushing events to Supabase');

		const all = await this.state.storage.list({ prefix: 'event:' });
		const entries = Array.from(all.entries());

		if (entries.length === 0) {
			this.alarmScheduled = false;
			return;
		}

		try {
			// Process each record individually to avoid array insert issues
			for (const [_, value] of entries) {
				// Transform to match the exact column names in rum_metrics table
				const payload = {
					session_id: value.sessionId,
					domain_name: value.siteDomain,
					current_page: value.currentPage,
					previous_page: value.previousPage,
					events: value.data, // the full array of events
				};

				const res = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rum_metrics`, {
					method: 'POST',
					headers: {
						apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
						'Content-Type': 'application/json',
						Prefer: 'return=minimal',
					},
					body: JSON.stringify(payload), // Send a single object, not an array
				});

				if (!res.ok) {
					const errorText = await res.text();
					console.error(`Supabase insert failed: ${res.status} ${errorText}`);
					// Continue with other records even if one fails
				} else {
					// Delete this event from storage after successful insert
					await this.state.storage.delete(_);
					console.log(`Successfully inserted event to Supabase`);
				}
			}
		} catch (err) {
			console.error('Error during Supabase flush:', err);
		}

		// Reschedule the next flush if there might be more events
		const remaining = await this.state.storage.list({ prefix: 'event:' });
		if (Array.from(remaining.entries()).length > 0) {
			await this.state.storage.setAlarm(Date.now() + 30_000);
		} else {
			this.alarmScheduled = false;
		}
	}
}
