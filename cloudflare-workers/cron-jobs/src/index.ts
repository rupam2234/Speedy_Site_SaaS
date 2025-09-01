import { createClient } from '@supabase/supabase-js';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	DB: D1Database;
}

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase(env: Env) {
	if (!supabase) {
		supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
	}

	return supabase;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/fetch-happiness') {
			try {
				// const happinessData = await getHappinessByGeo(env);
				// return new Response(JSON.stringify(happinessData, null, 2), {
				// 	headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
				// });
			} catch (error: any) {
				return new Response('Error: ' + error?.message, { status: 500 });
			}
		}

		return new Response('not found', { status: 404 });
	},
};

type WebVitalsGeoStats = {
	domain_name: string | null;
	device_type: string | null;
	country: string | null;
	lcp_good_percentage: number | null;
	lcp_average_percentage: number | null;
	lcp_poor_percentage: number | null;
	inp_good_percentage: number | null;
	inp_average_percentage: number | null;
	inp_poor_percentage: number | null;
	cls_good_percentage: number | null;
	cls_average_percentage: number | null;
	cls_poor_percentage: number | null;
	ttfb_good_percentage: number | null;
	ttfb_average_percentage: number | null;
	ttfb_poor_percentage: number | null;
	fcp_good_percentage: number | null;
	fcp_average_percentage: number | null;
	fcp_poor_percentage: number | null;
	total_measurements: number | null;
};
