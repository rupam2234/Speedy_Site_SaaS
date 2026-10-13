import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	API_SECRET: string;
	DB: D1Database;
}

export async function fetchAnalyticsFromSupabase(env: Env, targetDate?: string) {
	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	const date = targetDate || new Date().toISOString().split('T')[0]; 

	const { data, error } = await supabase.rpc('get_daily_web_metrics', {
		target_date: date,
	});

	if (error) {
		console.error('Error fetching metrics from Supabase:', error);
		return [];
	}

	return data;
}

// One read for existing keys, then all writes in a single batch: the old
// per-row SELECT + UPDATE/INSERT loop ran 3 queries per record every cron run
async function updateMetricsToD1(env: Env, metrics: any[]) {
	const updateSQL = `
    UPDATE web_metrics SET
      total_pageviews = ?, total_sessions = ?, avg_pages_per_session = ?, bounce_rate = ?,
      llm_traffic = ?, llm_traffic_percentage = ?, country_distribution = ?
    WHERE date_collected = ? AND domain_name = ? AND device_type = ?;
  `;

	const insertSQL = `
    INSERT INTO web_metrics (
      date_collected, domain_name, device_type,
      total_pageviews, total_sessions, avg_pages_per_session, bounce_rate,
      llm_traffic, llm_traffic_percentage, country_distribution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

	if (metrics.length === 0) return;

	const existing = new Set<string>();
	const dates = [...new Set(metrics.map((record: any) => record.date_collected))];
	for (const date of dates) {
		const rows = await env.DB
			.prepare(`SELECT domain_name, device_type FROM web_metrics WHERE date_collected = ?`)
			.bind(date)
			.all();
		if (!rows.success) {
			console.error('Error loading existing keys:', rows.error);
			return;
		}
		for (const row of rows.results) {
			existing.add(`${row.domain_name}|${row.device_type}`);
		}
	}

	const statements = metrics.map((record: any) =>
		existing.has(`${record.domain_name}|${record.device_type}`)
			? env.DB.prepare(updateSQL).bind(
					record.total_pageviews,
					record.total_sessions,
					record.avg_pages_per_session,
					record.bounce_rate,
					record.llm_traffic,
					record.llm_traffic_percentage,
					JSON.stringify(record.country_distribution),
					record.date_collected,
					record.domain_name,
					record.device_type
				)
			: env.DB.prepare(insertSQL).bind(
					record.date_collected,
					record.domain_name,
					record.device_type,
					record.total_pageviews,
					record.total_sessions,
					record.avg_pages_per_session,
					record.bounce_rate,
					record.llm_traffic,
					record.llm_traffic_percentage,
					JSON.stringify(record.country_distribution)
				)
	);

	const results = await env.DB.batch(statements);
	results.forEach((result, i) => {
		if (!result.success) {
			console.error(`Failed to upsert record ${i}:`, result.error);
		}
	});
}

async function getTrafficByCountries(
	env: Env,
	startDate: string,
	endDate:string,
	domainName?: string
) {

	let query = `SELECT device_type, country_distribution FROM web_metrics WHERE date_collected BETWEEN ? AND ?`;

	const bindParams: any[] = [startDate, endDate];

	if (domainName) {
		query += `AND domain_name = ?`;
		bindParams.push(domainName);
	}

	query += `ORDER BY date_collected DESC;`;

	const result = await env.DB.prepare(query)
		.bind(...bindParams)
		.all();

	if (!result.success) {
		console.error('Failed to fetch country wise traffic data!', result.error);
		return [];
	}

	return result.results;
}

async function getMetricsFromD1(
	env: Env,
	startDate: string,
	endDate:string,
	domainName?: string
) {
	// const { startDate, endDate } = getDateRange(range);

	let query = `
		SELECT 
			date_collected,
			domain_name,
			device_type,
			total_pageviews,
			total_sessions,
			avg_pages_per_session,
			bounce_rate,
			llm_traffic,
			llm_traffic_percentage
		FROM web_metrics
		WHERE date_collected BETWEEN ? AND ?
	`;

	const bindParams: any[] = [startDate, endDate];

	if (domainName) {
		query += ` AND domain_name = ?`;
		bindParams.push(domainName);
	}

	query += ` ORDER BY date_collected DESC;`;

	const result = await env.DB.prepare(query)
		.bind(...bindParams)
		.all();

	if (!result.success) {
		console.error('Failed to fetch metrics from D1:', result.error);
		return [];
	}

	return result.results;
}

async function runCronJob(env: Env) {
	const data = await fetchAnalyticsFromSupabase(env);
	const cleanData = data.filter((item: any) => item.device_type !== 'unknown');
	await updateMetricsToD1(env, cleanData);
	return cleanData.length;
}

export default {
	// cron job

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		try {
			const insertedCount = await runCronJob(env);
			console.log(`Cron job ran successfully. Inserted ${insertedCount} records.`);
		} catch (err: any) {
			console.error('Cron job failed:', err);
		}
	},

	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response('OK', { status: 200 });
		}

		// All data and trigger endpoints require the shared secret header
		if ((request.headers.get('Authorization') || '') !== `Bearer ${env.API_SECRET}`) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Manual trigger (authenticated)
		if (url.pathname === '/run-job') {
			try {
				const insertedCount = await runCronJob(env);
				return new Response(JSON.stringify({ inserted: insertedCount }, null, 2), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err: any) {
				return new Response('Error: ' + err.message, { status: 500 });
			}
		}

		// gets overview data
		if (url.pathname === '/metrics') {
			const startDate = url.searchParams.get('startDate') as string;
			const endDate = url.searchParams.get("endDate") as string;
			const domain = url.searchParams.get('domain') || undefined;

			try {
				const metrics = await getMetricsFromD1(env, startDate, endDate, domain);
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

		if (url.pathname === '/country-breakdown') {
			const startDate = url.searchParams.get('startDate') || undefined;
			const endDate = url.searchParams.get("endDate") || undefined;
			const domain = url.searchParams.get("domain") || undefined;

			try {

				if(startDate === undefined || endDate === undefined){
					return new Response('Bad request! Missing Dates', {status: 400});
				}
				const data = await getTrafficByCountries(env, startDate, endDate, domain);
				return new Response(JSON.stringify(data, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'public, max-age=3600',
					},
				});
			} catch (error: any) {
				return new Response('Error fetching country based pageviews: ' + error.maxage, { status: 500 });
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};
