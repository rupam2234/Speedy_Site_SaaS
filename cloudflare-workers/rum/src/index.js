import script from './rum.txt';

export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === '/rum.js' && url.hostname === 'rum.speedy.site') {
			return new Response(script, {
				headers: {
					'Content-Type': 'application/javascript',
					'Cache-Control': 'public, max-age=86400',
				},
			});
		}

		return new Response('Not found', { status: 404 });
	},
};
