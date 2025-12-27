import script from './rum.txt';

export default {
	async fetch(request) {
		const url = new URL(request.url);

		const cf = request.cf || {};

		const geoInfo = {
			country: cf.country || 'unknown',
			region: cf.region || 'unknown',
			city: cf.city || 'unknown',
			timezone: cf.timezone || 'unknown',
			org: cf.asOrganization || 'unknown',
			continent: cf.continent || 'unknown',
		};

		const geoScript = `
			window.__GEO_INFO__ = ${JSON.stringify(geoInfo)};
		`;

		const fullScript = geoScript + script;

		if (url.pathname === '/rum.js' && url.hostname === 'rum.speedy.site') {
			return new Response(fullScript, {
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
