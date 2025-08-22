// backup

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
				console.error(`Supabase insert failed: ${res.status} ${errorText}`);
				return new Response('Error writing to Supabase', { status: 500 });
			}

			console.log('Successfully inserted to Supabase');
			return new Response('Data accepted', { status: 202 });
		} catch (err) {
			console.error('Invalid JSON or Supabase error:', err);
			return new Response('Invalid data', { status: 400 });
		}
	}
}
