import script from './rum.txt';

export default {
	async fetch(request) {
		const url = new URL(request.url);
		// const userAgent = request.headers.get('user-agent') || 'unknown';

		// console.log('Requested path:', url.pathname);
		// console.log('User-Agent:', userAgent);

		if (url.pathname === '/rum.js') {
			return new Response(script, {
				headers: {
					'Content-Type': 'application/javascript',
					'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
					Expires: '0',
					Pragma: 'no-cache',
				},
			});
		}

		return new Response('Not found', { status: 404 });
	},
};
