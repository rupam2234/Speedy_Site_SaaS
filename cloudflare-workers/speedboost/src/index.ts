interface Env {
	'SITES-SPEED_BOOST': KVNamespace;
}

// In-memory cache for host→origin mapping (expires every 5 minutes)
const hostCache: Map<string, { origin: string; expires: number }> = new Map();

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Only GET requests
		if (request.method !== 'GET') return fetch(request);

		const url = new URL(request.url);
		const host = url.hostname;
		const pathname = url.pathname;

		// Skip if admin or logged-in
		const isAdmin = pathname.startsWith('/wp-admin') || pathname.startsWith('/wp-login.php') || url.searchParams.has('preview');
		const isLoggedIn = request.headers.get('cookie')?.includes('wordpress_logged_in_') || false;
		if (isAdmin || isLoggedIn) return fetch(request);

		// Try to serve from cache first
		const cache = (caches as any).default;
		const cached = await cache.match(request);
		if (cached) return cached;

		// Lookup origin from KV with in-memory caching
		let origin: string | null = null;
		const cachedOrigin = hostCache.get(host);
		const now = Date.now();

		if (cachedOrigin && cachedOrigin.expires > now) {
			origin = cachedOrigin.origin;
		} else {
			try {
				origin = await Promise.race([
					env['SITES-SPEED_BOOST'].get(host),
					new Promise<string | null>((_, reject) => setTimeout(() => reject(new Error('KV timeout')), 100)),
				]);
				if (origin) {
					hostCache.set(host, { origin, expires: now + 300_000 }); // Cache for 5 minutes
				}
			} catch {
				return fetch(request); // On timeout or error, bypass
			}
		}

		if (!origin) return fetch(request); // Fallback if origin not found

		// Build target URL
		const targetUrl = new URL(url.pathname + url.search, origin);

		// Fetch from origin with cacheEverything and optimizations
		const originResponse = await fetch(targetUrl.toString(), {
			cf: {
				cacheEverything: true,
				cacheTtl: 3600,
				autoMinify: { html: true, css: true, js: true },
				brotli: true,
			},
		});

		// Clone headers for modification
		const headers = new Headers(originResponse.headers);
		headers.delete('Set-Cookie');
		const contentType = headers.get('Content-Type') || '';

		// If it's HTML, apply PSI optimization headers
		if (contentType.includes('text/html') && originResponse.status === 200) {
			headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=1800');
			headers.set(
				'Content-Security-Policy',
				"default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
					"script-src * 'unsafe-inline' 'unsafe-eval'; " +
					"style-src * 'unsafe-inline'; " +
					'img-src * data: blob:; ' +
					'font-src * data:; ' +
					"connect-src * 'unsafe-inline'; " +
					'frame-src *; ' +
					'media-src *;'
			);
			headers.set('X-Content-Type-Options', 'nosniff');
			headers.set('X-Frame-Options', 'SAMEORIGIN');
			headers.set('X-XSS-Protection', '1; mode=block');
		} else if (originResponse.status === 200) {
			// Other content types: apply aggressive cache
			if (contentType.includes('text/css') || contentType.includes('application/javascript')) {
				headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
			} else if (contentType.startsWith('image/')) {
				headers.set('Cache-Control', 'public, max-age=604800, s-maxage=2592000');
			} else {
				headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
			}
		}

		// Construct new response and cache it
		const responseToCache = new Response(originResponse.body, {
			status: originResponse.status,
			statusText: originResponse.statusText,
			headers,
		});

		// Cache the response async (non-blocking)
		ctx.waitUntil(cache.put(request, responseToCache.clone()));

		return responseToCache;
	},
};
