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

	for (const record of metrics) {
		const check = await env.DB.prepare(
			`SELECT 1 FROM traffic_source WHERE day = ? AND domain = ? AND device_type = ? AND referral_domain = ?`
		)
			.bind(record.day, record.domain, record.device_type, record.referral_domain)
			.all();

		if (!check.success) {
			console.error('Error checking if record exists:', check.error);
			continue;
		}

		if (check.results.length > 0) {
			// ✅ Update existing
			const update = await env.DB.prepare(updateSQL)
				.bind(record.count, record.day, record.domain, record.device_type, record.referral_domain)
				.run();

			if (!update.success) {
				console.error('Failed to update record:', update.error);
			}
		} else {
			// ✅ Insert new
			const insert = await env.DB.prepare(insertSQL)
				.bind(record.day, record.referral_domain, record.domain, record.device_type, record.count)
				.run();

			if (!insert.success) {
				console.error('Failed to insert record:', insert.error);
			}
		}
	}
}

/**
 * Get stored analytics data from D1
 */
async function get_traffic_source(
	env: Env,
	range: 'yesterday' | 'last7days' | '30days' | 'thisMonth' | 'lastMonth' | 'last6Months' | 'year' | 'today' | 'thisYear' = '30days',
	domain_name: string | undefined
) {
	const { startDate, endDate } = getDateRange(range);

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
			const range =
				(url.searchParams.get('range') as 'yesterday' | 'last7days' | '30days' | 'thisMonth' | 'lastMonth' | 'last6Months' | 'year') ||
				'30days';

			const domain = url.searchParams.get('domain') || undefined;
			const access_key = url.searchParams.get('key') || undefined;

			if (access_key !== env.API_SECRET) {
				return new Response('Unauthorized request', { status: 403 });
			}

			try {
				const metrics = await get_traffic_source(env, range, domain);
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

/**
 * Utility to get date range for analytics queries
 */
function getDateRange(
	range: 'yesterday' | 'last7days' | '30days' | 'thisMonth' | 'lastMonth' | 'last6Months' | 'year' | 'today' | 'thisYear' = '30days'
) {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);

	let startDate: string;
	let endDate: string;

	switch (range) {
		case 'today':
			startDate = endDate = today.toISOString().slice(0, 10);
			break;
		case 'yesterday':
			startDate = endDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			break;
		case 'last7days':
			startDate = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
			endDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			break;
		case '30days':
			startDate = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
			endDate = today.toISOString().slice(0, 10);
			break;
		case 'thisMonth':
			startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
			endDate = today.toISOString().slice(0, 10);
			break;
		case 'lastMonth': {
			const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
			const lastMonthEnd = new Date(firstOfThisMonth.getTime() - 86400000);
			const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));
			startDate = lastMonthStart.toISOString().slice(0, 10);
			endDate = lastMonthEnd.toISOString().slice(0, 10);
			break;
		}
		case 'last6Months':
			startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 6, 1)).toISOString().slice(0, 10);
			endDate = today.toISOString().slice(0, 10);
			break;
		case 'thisYear':
			startDate = new Date(Date.UTC(today.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
			endDate = today.toISOString().slice(0, 10);
			break;
		case 'year':
			startDate = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1)).toISOString().slice(0, 10);
			endDate = today.toISOString().slice(0, 10);
			break;
		default:
			startDate = endDate = today.toISOString().slice(0, 10);
	}

	return { startDate, endDate };
}
