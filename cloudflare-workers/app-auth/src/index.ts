import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

interface Env {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string; // For database operations
	SUPABASE_JWT_KEY: string; // For JWT verification
}

const supabaseAdmin = (env: Env) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // Replace with your domain in production
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Content-Type': 'application/json',
};

async function verifyToken(token: string, jwtSecret: string, supabaseUrl: string) {
	try {
		const encoder = new TextEncoder();
		const secret = encoder.encode(jwtSecret);
		const { payload } = await jwtVerify(token, secret, {
			issuer: `${supabaseUrl}/auth/v1`,
			audience: 'authenticated',
		});
		return payload;
	} catch (error) {
		throw new Error('Invalid or expired token');
	}
}

function isInSubscriptionPeriod(subscription: any): boolean {
	const now = new Date();
	const start = subscription.period_starts_at ? new Date(subscription.period_starts_at) : null;
	const end = subscription.period_ends_at ? new Date(subscription.period_ends_at) : null;
	return start !== null && end !== null && now >= start && now <= end;
}

export default {
	async fetch(request: Request, env: Env) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		try {
			if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_JWT_KEY) {
				console.error('Missing environment variables:', {
					SUPABASE_URL: !!env.SUPABASE_URL,
					SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
					SUPABASE_JWT_KEY: !!env.SUPABASE_JWT_KEY,
				});
				return new Response(JSON.stringify({ message: 'Server configuration error', error: 'Missing required environment variables' }), {
					status: 500,
					headers: corsHeaders,
				});
			}

			const supabase = supabaseAdmin(env);

			const authHeader = request.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return new Response(JSON.stringify({ message: 'Unauthorized: Missing or invalid Authorization header' }), {
					status: 401,
					headers: corsHeaders,
				});
			}

			const token = authHeader.slice(7).trim();
			const payload = await verifyToken(token, env.SUPABASE_JWT_KEY, env.SUPABASE_URL);
			const userId = payload.sub;
			if (!userId) {
				return new Response(JSON.stringify({ message: 'Unauthorized: Missing user ID in token' }), {
					status: 401,
					headers: corsHeaders,
				});
			}

			console.log('Checking subscription for user:', userId);
			const { data: subscription, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();

			if (error && error.code !== 'PGRST116') {
				console.error('Supabase query error:', error);
				return new Response(JSON.stringify({ message: 'Database error', error: error.message }), {
					status: 500,
					headers: corsHeaders,
				});
			}

			if (!subscription) {
				console.log('No subscription found for user:', userId);

				const now = new Date();
				const trialEndsAt = new Date(now);
				trialEndsAt.setDate(now.getDate() + 7);

				const subscriptionData = {
					user_id: userId,
					status: 'active',
					plan: 'Free',
					period_starts_at: now.toISOString(),
					period_ends_at: trialEndsAt.toISOString(),
					trial_ends_at: trialEndsAt.toISOString(),
					billing_interval: 'monthly',
					current_usage: 0,
					created_at: now.toISOString(),
					updated_at: now.toISOString(),
				};

				console.log('Attempting to insert subscription:', subscriptionData);

				const { error: insertError } = await supabase.from('subscriptions').insert(subscriptionData);
				if (insertError) {
					console.error('Failed to insert subscription:', insertError);
					return new Response(JSON.stringify({ message: 'Failed to create free subscription', error: insertError.message }), {
						status: 500,
						headers: corsHeaders,
					});
				}

				console.log('Created free subscription for user:', userId);

				return new Response(
					JSON.stringify({
						message: 'Free subscription created',
						access: 'granted',
						plan: 'Free',
						user: {
							id: userId,
							email: payload.email || null,
							name: payload.name || null,
						},
					}),
					{ headers: corsHeaders }
				);
			}

			if (subscription.status !== 'active') {
				return new Response(JSON.stringify({ message: `Subscription status is '${subscription.status}'. Access denied.` }), {
					status: 403,
					headers: corsHeaders,
				});
			}

			if (!isInSubscriptionPeriod(subscription)) {
				return new Response(JSON.stringify({ message: 'Subscription period expired or not started' }), {
					status: 403,
					headers: corsHeaders,
				});
			}

			if (subscription.current_usage >= subscription.usage_limit) {
				switch (subscription.degradation_policy) {
					case 'block':
						return new Response(JSON.stringify({ message: 'Usage limit exceeded: Access blocked.' }), {
							status: 429,
							headers: corsHeaders,
						});
					case 'degrade':
						return new Response(
							JSON.stringify({
								message: 'Usage limit exceeded: Degraded service mode.',
								subscription,
							}),
							{ headers: corsHeaders }
						);
					case 'allow':
						break;
					default:
						return new Response(JSON.stringify({ message: 'Usage limit exceeded: Unknown degradation policy.' }), {
							status: 429,
							headers: corsHeaders,
						});
				}
			}

			const { error: updateError } = await supabase
				.from('subscriptions')
				.update({
					current_usage: subscription.current_usage + 1,
					updated_at: new Date().toISOString(),
				})
				.eq('user_id', userId);

			if (updateError) {
				console.error('Supabase update error:', updateError);
				return new Response(JSON.stringify({ message: 'Failed to update usage', error: updateError.message }), {
					status: 500,
					headers: corsHeaders,
				});
			}

			return new Response(JSON.stringify({ message: 'Request allowed', subscription }), { headers: corsHeaders });
		} catch (err: any) {
			console.error('Request error:', err);
			return new Response(JSON.stringify({ message: 'Unauthorized', error: err.message }), {
				status: 401,
				headers: corsHeaders,
			});
		}
	},
};
