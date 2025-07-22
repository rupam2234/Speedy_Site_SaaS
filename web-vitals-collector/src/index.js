addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	try {
		const data = await request.json();
		console.log('Received web vitals data:', data);
		return new Response('Data received', { status: 200 });
	} catch (err) {
		return new Response('Bad Request', { status: 400 });
	}
}
