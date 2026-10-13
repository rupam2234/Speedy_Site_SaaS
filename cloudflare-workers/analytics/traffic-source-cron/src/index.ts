import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	DB: D1Database;
	API_SECRET: string;
}

/**
 * Fetch traffic source data from Supabase
 */
export async function fetchTrafficSource(env: Env) {
	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	const { data, error } = await supabase.rpc('traffic_source');

	if (error) {
		console.error('Error fetching metrics from Supabase:', error);
		return [];
	}

	return data;
}

/**
 * Update or insert metrics into D1
 * - If a record for (day, domain, device_type, referral_domain) exists → update it.
 * - Otherwise → insert new record.
 */
// One read for existing keys, then all writes in a single batch: the old
// per-row SELECT + UPDATE/INSERT loop ran 3 queries per record every cron run
async function updateDataOnD1(env: Env, metrics: any[]) {
	const updateSQL = `
    UPDATE traffic_source 
    SET count = ? 
    WHERE day = ? AND domain = ? AND device_type = ? AND referral_domain = ?;
  `;

	const insertSQL = `
    INSERT INTO traffic_source (
      day, referral_domain, domain, device_type, count
    ) VALUES (?, ?, ?, ?, ?);
  `;

	if (metrics.length === 0) return;

	const existing = new Set<string>();
	const days = [...new Set(metrics.map((record: any) => record.day))];
	for (const day of days) {
		const rows = await env.DB
			.prepare(`SELECT domain, device_type, referral_domain FROM traffic_source WHERE day = ?`)
			.bind(day)
			.all();
		if (!rows.success) {
			console.error('Error loading existing keys:', rows.error);
			return;
		}
		for (const row of rows.results) {
			existing.add(`${row.domain}|${row.device_type}|${row.referral_domain}`);
		}
	}

	const statements = metrics.map((record: any) =>
		existing.has(`${record.domain}|${record.device_type}|${record.referral_domain}`)
			? env.DB.prepare(updateSQL).bind(
					record.count,
					record.day,
					record.domain,
					record.device_type,
					record.referral_domain
				)
			: env.DB.prepare(insertSQL).bind(
					record.day,
					record.referral_domain,
					record.domain,
					record.device_type,
					record.count
				)
	);

	const results = await env.DB.batch(statements);
	results.forEach((result, i) => {
		if (!result.success) {
			console.error(`Failed to upsert record ${i}:`, result.error);
		}
	});
}

/**
 * Get stored analytics data from D1
 */
async function get_traffic_source(
	env: Env,
	startDate: string,
	endDate:string,
	domain_name: string | undefined
) {

	const query = `
		SELECT day, device_type, referral_domain, count 
		FROM traffic_source 
		WHERE domain = ? AND day BETWEEN ? AND ?;
	`;

	const result = await env.DB.prepare(query).bind(domain_name, startDate, endDate).all();

	if (!result.success) {
		console.error('Failed to fetch metrics from D1:', result.error);
		return [];
	}

	return result.results;
}

/**
 * Run cron job: fetch latest data from Supabase, then upsert to D1
 */
async function runCronJob(env: Env) {
	const data = await fetchTrafficSource(env);
	const cleanData = data.filter((item: any) => item.device_type !== 'unknown');
	await updateDataOnD1(env, cleanData);
	return cleanData.length;
}

/**
 * Cloudflare Worker entry point
 */
export default {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		try {
			const updatedCount = await runCronJob(env);
			console.log(`Cron job ran successfully. Updated/Inserted ${updatedCount} records.`);
		} catch (err: any) {
			console.error('Cron job failed:', err);
		}
	},

	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response('OK', { status: 200 });
		}

		// All data and trigger endpoints require the shared secret header
		if ((request.headers.get('Authorization') || '') !== `Bearer ${env.API_SECRET}`) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Manual trigger
		if (url.pathname === '/run-job') {
			try {
				const count = await runCronJob(env);
				return new Response(`Job ran successfully. Updated ${count} records.`, { status: 200 });
			} catch (err: any) {
				console.error('Manual job failed:', err);
				return new Response('Job failed: ' + err.message, { status: 500 });
			}
		}

		// Fetch stored data
		if (url.pathname === '/get-source') {
			const startDate = url.searchParams.get('startDate') as string;
			const endDate = url.searchParams.get("endDate") as string;
			const domain = url.searchParams.get('domain') || undefined;

			try {
				const metrics = await get_traffic_source(env, startDate, endDate, domain);
				return new Response(JSON.stringify(metrics, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'public, max-age=3600',
					},
				});
			} catch (error: any) {
				return new Response('Error fetching metrics: ' + error.message, { status: 500 });
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

