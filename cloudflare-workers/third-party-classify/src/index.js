export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const domain = url.pathname.slice(1);

		if (!domain) {
			return new Response('Missing domain in URL', { status: 400 });
		}

		if (request.method === 'GET') {
			const cached = await env.DOMAIN_CACHE.get(domain);
			if (cached === null) {
				return new Response(null, { status: 404 });
			}
			return new Response(cached, { headers: { 'Content-Type': 'text/plain' } });
		}

		if (request.method === 'PUT') {
			const value = await request.text();
			await env.DOMAIN_CACHE.put(domain, value, { expirationTtl: 86400 });
			return new Response('OK');
		}

		return new Response('Method Not Allowed', { status: 405 });
	},
};
