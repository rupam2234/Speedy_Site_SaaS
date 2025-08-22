import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	SUBSCRIPTION_METADATA: KVNamespace;
}

async function updateKVFromSupabase(env: Env): Promise<string> {
	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	const { data, error } = await supabase.from('cloudflare_kv_tracking').select('*');

	if (error) {
		console.error('Failed to fetch Supabase view:', error.message);
		throw new Error(error.message);
	}

	if (!data || data.length === 0) {
		console.log('No data returned from Supabase view.');
		return 'No records found.';
	}

	let updatedCount = 0;

	await Promise.all(
		data.map(async (row) => {
			try {
				const domain = row.website_name?.toLowerCase().trim();
				if (!domain) return;

				const key = `domain:${domain}`;
				const newValue = JSON.stringify(row);

				const oldValue = await env.SUBSCRIPTION_METADATA.get(key);

				if (oldValue !== newValue) {
					await env.SUBSCRIPTION_METADATA.put(key, newValue);
					updatedCount++;
				}
			} catch (err) {
				console.error(`Error processing row: ${JSON.stringify(row)}`, err);
			}
		})
	);

	return `Updated ${updatedCount} records in KV.`;
}

export default {
	// Scheduled cron trigger
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		if (event.cron) {
			try {
				await updateKVFromSupabase(env);
			} catch (err) {
				console.error('Scheduled update failed:', err);
			}
		}
	},

	// Manual HTTP trigger
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/update' && request.method === 'GET') {
			try {
				const result = await updateKVFromSupabase(env);
				return new Response(result, { status: 200 });
			} catch (err) {
				return new Response('Error: ' + (err as Error).message, { status: 500 });
			}
		} else if (url.pathname === '/update' && request.method === 'POST') {
			// triggers supabase function as webhook

			try {
				const row: any = await request.json();
				const domain = row.website_name?.toLowerCase().trim();
				if (!domain) {
					return new Response('Missing website_name', { status: 400 });
				}

				const key = `domain:${domain}`;
				const newValue = JSON.stringify(row);

				const oldValue = await env.SUBSCRIPTION_METADATA.get(key);

				if (oldValue !== newValue) {
					await env.SUBSCRIPTION_METADATA.put(key, newValue);
					return new Response('KV updated.', { status: 200 });
				} else {
					return new Response('No changes needed.', { status: 200 });
				}
			} catch (error) {
				console.error('Error updating KV from webhook:', error);
				return new Response('Error: ' + (error as Error).message, { status: 500 });
			}
		} else if (url.pathname === '/' && request.method === 'GET') {
			// Optional: Health check or fallback
			return new Response('KV Worker is running. Visit /update to trigger manually.', {
				status: 200,
			});
		}

		return new Response('Not Found', { status: 404 });
	},
};
