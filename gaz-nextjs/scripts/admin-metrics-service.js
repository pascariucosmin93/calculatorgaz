const http = require('http');
const fs = require('fs');

const PORT = Number(process.env.PORT || 8089);
const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://calculatorgaz:3000').replace(/\/+$/, '');
const keyFile = process.env.INTERNAL_API_KEY_FILE || '';
const INTERNAL_API_KEY = keyFile && fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : '';

const json = (res, status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload)); };
const metric = (name, help, value, labels = '') => `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name}${labels} ${Number(value) || 0}\n`;
const supportTicketsMetric = (tickets = {}) => [
  '# HELP calculatorgaz_support_tickets Support tickets grouped by current status.',
  '# TYPE calculatorgaz_support_tickets gauge',
  `calculatorgaz_support_tickets{status="open"} ${Number(tickets.OPEN) || 0}`,
  `calculatorgaz_support_tickets{status="progress"} ${Number(tickets.IN_PROGRESS) || 0}`,
  `calculatorgaz_support_tickets{status="done"} ${Number(tickets.RESOLVED) || 0}`
].join('\n') + '\n';

function prometheusMetrics(payload, dependencies) {
  // Only aggregated operational data is exported. User identities, invoice
  // contents, OCR text, emails and individual readings never leave the app.
  return [
    metric('calculatorgaz_users_total', 'Registered CalculatorGaz users.', payload.users),
    metric('calculatorgaz_active_users_24h', 'Users with a reading in the last 24 hours.', payload.activeUsers),
    metric('calculatorgaz_new_users_month', 'Users created since the start of the month.', payload.newUsers),
    metric('calculatorgaz_readings_24h', 'Readings created in the last 24 hours.', payload.calculationsToday),
    metric('calculatorgaz_readings_month', 'Readings created since the start of the month.', payload.calculationsMonth),
    metric('calculatorgaz_invoice_uploads_month', 'Invoice uploads since the start of the month.', payload.invoiceUploads),
    metric('calculatorgaz_notifications_month', 'Notifications created since the start of the month.', payload.notifications),
    metric('calculatorgaz_unread_notifications', 'Unread notifications.', payload.unreadNotifications),
    metric('calculatorgaz_login_successes_24h', 'Successful logins in the last 24 hours.', payload.loginSuccesses24h),
    metric('calculatorgaz_login_failures_24h', 'Failed login attempts in the last 24 hours.', payload.loginFailures24h),
    supportTicketsMetric(payload.supportTickets),
    metric('calculatorgaz_dependency_up', 'Whether a required Aiven dependency can be reached and authenticated.', dependencies.database.up ? 1 : 0, '{dependency="postgresql"}'),
    metric('calculatorgaz_dependency_latency_seconds', 'Latency of an authenticated dependency health check.', dependencies.database.latencyMs / 1000, '{dependency="postgresql"}')
  ].join('');
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
  const jsonFormat = req.url === '/metrics?format=json';
  if (req.method !== 'GET' || (req.url !== '/metrics' && !jsonFormat)) return json(res, 404, { error: 'Not found' });
  if (!INTERNAL_API_KEY) return json(res, 503, { error: 'INTERNAL_API_KEY is not configured' });
  try {
    const [response, dependenciesResponse] = await Promise.all([
      fetch(`${APP_BASE_URL}/api/internal/admin/metrics`, { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, signal: AbortSignal.timeout(8000) }),
      fetch(`${APP_BASE_URL}/api/internal/health/dependencies`, { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, signal: AbortSignal.timeout(10000) })
    ]);
    const body = await response.text();
    if (!response.ok) return json(res, response.status, { error: 'Application metrics endpoint failed' });
    const dependencies = dependenciesResponse.ok
      ? await dependenciesResponse.json()
      : { database: { up: false, latencyMs: 0 } };
    if (jsonFormat) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(body);
    }
    const payload = JSON.parse(body);
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(prometheusMetrics(payload, dependencies));
  } catch (error) { return json(res, 502, { error: error.message || 'Metrics service unavailable' }); }
});
server.listen(PORT, '0.0.0.0', () => console.log(`admin-metrics-service listening on ${PORT}`));
