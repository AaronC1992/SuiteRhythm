import { describe, expect, it, vi } from 'vitest';
import { addTimingHeaders, logApiMetric } from '../lib/server-observability.js';

describe('server observability', () => {
  it('adds duration headers to responses', () => {
    const response = new Response('ok');
    addTimingHeaders(response, 'studio/render', Date.now() - 12);

    expect(response.headers.get('X-Request-Duration-Ms')).toMatch(/^\d+$/);
    expect(response.headers.get('Server-Timing')).toMatch(/^studio_render;dur=\d+$/);
  });

  it('logs structured api metrics', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const event = logApiMetric('/api/analyze', Date.now() - 5, { status: 200, cache: 'MISS' });

    expect(event).toMatchObject({ event: 'api_metric', route: '/api/analyze', status: 200, cache: 'MISS' });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});