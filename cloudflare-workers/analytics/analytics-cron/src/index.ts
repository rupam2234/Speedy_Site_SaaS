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
	range: 'yesterday' | 'last7days' | '30days' | 'thisMonth' | 'lastMonth' | 'last6Months' | 'year' | 'today' | 'thisYear' = '30days',
	domainName?: string
) {
	const { startDate, endDate } = getDateRange(range);

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
	range: 'yesterday' | 'last7days' | '30days' | 'thisMonth' | 'lastMonth' | 'last6Months' | 'year' | 'today' | 'thisYear' = '30days',
	domainName?: string
) {
	const { startDate, endDate } = getDateRange(range);

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
			const range = url.searchParams.get('range') as
				| 'yesterday'
				| 'last7days'
				| '30days'
				| 'thisMonth'
				| 'lastMonth'
				| 'last6Months'
				| 'year';

			const domain = url.searchParams.get('domain') || undefined;

			try {
				const metrics = await getMetricsFromD1(env, range || '30days', domain);
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
			const range = url.searchParams.get('range') as
				| 'yesterday'
				| 'last7days'
				| '30days'
				| 'thisMonth'
				| 'lastMonth'
				| 'last6Months'
				| 'year'
				| 'today'
				| 'thisYear';
			const domain = url.searchParams.get('domain') || undefined;

			try {
				const data = await getTrafficByCountries(env, range || '30days', domain);
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

function getDateRange(
	range: 'yesterday' | 'last7days' | '30days' | 'thisMonth' | 'lastMonth' | 'last6Months' | 'year' | 'today' | 'thisYear' = '30days'
) {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0); // Set time to midnight UTC

	let startDate: string;
	let endDate: string;

	switch (range) {
		case 'today':
			startDate = today.toISOString().slice(0, 10);
			endDate = startDate;
			break;
		case 'yesterday':
			startDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			endDate = startDate;
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
			endDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			break;
		case 'lastMonth':
			const firstOfCurrentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
			const lastMonthEnd = new Date(firstOfCurrentMonth.getTime() - 86400000);
			const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));
			startDate = lastMonthStart.toISOString().slice(0, 10);
			endDate = lastMonthEnd.toISOString().slice(0, 10);
			break;
		case 'last6Months':
			const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 6, 1));
			startDate = sixMonthsAgo.toISOString().slice(0, 10);
			endDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			break;
		case 'thisYear':
			const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
			startDate = startOfYear.toISOString().slice(0, 10);
			endDate = today.toISOString().slice(0, 10);
			break;
		case 'year':
			const startOfPrevYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
			startDate = startOfPrevYear.toISOString().slice(0, 10);
			endDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			break;
		default:
			startDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
			endDate = startDate;
	}

	return { startDate, endDate };
}
