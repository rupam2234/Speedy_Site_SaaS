import script from './web-vitals-extended.txt';

export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === '/web-vitals-extended.js') {
			return new Response(script, {
				headers: {
					'Content-Type': 'application/javascript',
					'Cache-Control': 'no-store',
				},
			});
		}

		return new Response('Not found', { status: 404 });
	},
};
