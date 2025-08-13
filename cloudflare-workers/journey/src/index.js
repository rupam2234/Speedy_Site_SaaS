import journeyScript from './journey.min.txt';

addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (url.pathname === '/journey') {
		event.respondWith(
			new Response(journeyScript, {
				headers: {
					'Content-Type': 'application/javascript',
					'Cache-Control': 'public, max-age=86400',
				},
			})
		);
	} else {
		event.respondWith(new Response('Not found', { status: 404 }));
	}
});
