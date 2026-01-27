import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	DB: D1Database;
}

export async function fetchAnalyticsFromSupabase(env: Env, targetDate?: string) {
	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	// const date = targetDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];
	const date = targetDate || new Date().toISOString().split('T')[0]; // Current day for hourly updates

	const { data, error } = await supabase.rpc('get_daily_web_metrics', {
		target_date: date,
	});

	if (error) {
		console.error('Error fetching metrics from Supabase:', error);
		return [];
	}

	return data;
}

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

	for (const record of metrics) {
		// Check if record exists
		const existsResult = await env.DB.prepare(`SELECT 1 FROM web_metrics WHERE date_collected = ? AND domain_name = ? AND device_type = ?`)
			.bind(record.date_collected, record.domain_name, record.device_type)
			.all();

		if (!existsResult.success) {
			console.error('Error checking if record exists:', existsResult.error);
			continue;
		}

		if (existsResult.results.length > 0) {
			// UPDATE
			const updateResult = await env.DB.prepare(updateSQL)
				.bind(
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
				.run();

			if (!updateResult.success) {
				console.error('Failed to update record:', updateResult.error);
			}
		} else {
			// INSERT
			const insertResult = await env.DB.prepare(insertSQL)
				.bind(
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
				.run();

			if (!insertResult.success) {
				console.error('Failed to insert record:', insertResult.error);
			}
		}
	}
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

		// Test path
		if (url.pathname === '/test' || url.pathname === '/') {
			try {
				const insertedCount = await runCronJob(env);
				return new Response(JSON.stringify({ inserted: insertedCount }, null, 2), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err: any) {
				return new Response('Error: ' + err.message, { status: 500 });
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};
