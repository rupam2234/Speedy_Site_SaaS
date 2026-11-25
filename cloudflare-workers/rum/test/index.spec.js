import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('RUM collector worker', () => {
	it('serves the collector from the production hostname', async () => {
		const request = new Request('https://rum.speedy.site/rum.js');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/javascript');
		const script = await response.text();
		expect(script).toContain('pageview_id');
		expect(script).toContain('2e4');
		expect(script).toContain('text/plain;charset=UTF-8');
	});

	it('does not serve the collector from another hostname', async () => {
		const response = await SELF.fetch('https://example.com/rum.js');
		expect(response.status).toBe(404);
	});
});
