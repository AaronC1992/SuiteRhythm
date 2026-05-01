export function addTimingHeaders(response, routeName, startedAt) {
  const durationMs = getDurationMs(startedAt);
  response.headers.set('X-Request-Duration-Ms', String(durationMs));
  response.headers.append('Server-Timing', `${sanitizeMetricName(routeName)};dur=${durationMs}`);
  return response;
}

export function logApiMetric(routeName, startedAt, fields = {}) {
  const event = {
    event: 'api_metric',
    route: routeName,
    durationMs: getDurationMs(startedAt),
    timestamp: new Date().toISOString(),
    ...fields,
  };
  console.info(JSON.stringify(event));
  return event;
}

export function getDurationMs(startedAt) {
  return Math.max(0, Date.now() - Number(startedAt || Date.now()));
}

function sanitizeMetricName(name) {
  return String(name || 'api').replace(/[^a-z0-9_-]/gi, '_');
}
