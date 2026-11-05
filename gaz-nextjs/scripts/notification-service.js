const http = require('http');
const fs = require('fs');

const PORT = Number(process.env.PORT || 8082);
const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://calculatorgaz:3000').replace(/\/+$/, '');
const INTERNAL_API_KEY_FILE = process.env.INTERNAL_API_KEY_FILE || '';
const INTERNAL_API_KEY = INTERNAL_API_KEY_FILE && fs.existsSync(INTERNAL_API_KEY_FILE)
  ? fs.readFileSync(INTERNAL_API_KEY_FILE, 'utf8').trim() : '';
const REMINDER_HOUR = Number(process.env.READING_REMINDER_HOUR || 9);
const REMINDER_DAY = Number(process.env.READING_REMINDER_DAY || 2);
let lastReminderKey = '';
const webhookFile = process.env.DISCORD_WEBHOOK_URL_FILE || '';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ||
  (webhookFile && fs.existsSync(webhookFile) ? fs.readFileSync(webhookFile, 'utf8').trim() : '');

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });

const json = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const sendDiscord = async (payload) => {
  if (!DISCORD_WEBHOOK_URL) {
    throw new Error('DISCORD_WEBHOOK_URL is not set');
  }

  const message = payload.message || 'Notificare noua';
  const details = payload.details || {};
  const detailText = Object.entries(details)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const content = detailText ? `${message}\n${detailText}` : message;
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord webhook failed (${response.status}): ${text}`);
  }
};

const getRomaniaParts = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
};

const runReadingReminder = async () => {
  if (!INTERNAL_API_KEY) throw new Error('INTERNAL_API_KEY is not configured');
  const now = getRomaniaParts();
  let reminderDay = REMINDER_DAY;
  let reminderHour = REMINDER_HOUR;
  try {
    const configResponse = await fetch(`${APP_BASE_URL}/api/internal/reminders/reading`, { headers: { 'x-internal-api-key': INTERNAL_API_KEY } });
    if (configResponse.ok) {
      const config = await configResponse.json();
      reminderDay = Number(config.day) || REMINDER_DAY;
      reminderHour = Number.isInteger(Number(config.hour)) ? Number(config.hour) : REMINDER_HOUR;
    }
  } catch (error) { console.error('Reminder config unavailable:', error.message); }
  if (Number(now.day) !== reminderDay || Number(now.hour) !== reminderHour) return;
  const reminderKey = `${now.year}-${now.month}`;
  if (lastReminderKey === reminderKey) return;
  const response = await fetch(`${APP_BASE_URL}/api/internal/reminders/reading`, { method: 'POST', headers: { 'x-internal-api-key': INTERNAL_API_KEY } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Reminder endpoint failed (${response.status})`);
  lastReminderKey = reminderKey;
  if (result.created > 0) await sendDiscord({ message: 'Reminder autocitire trimis', details: { luna: reminderKey, utilizatori: result.created, zi: String(reminderDay).padStart(2, '0') } });
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/notify') {
      const payload = await readJson(req);
      await sendDiscord(payload);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && req.url === '/reminder-health') {
      return json(res, 200, { ok: true, reminderDay: REMINDER_DAY, reminderHour: REMINDER_HOUR });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unexpected error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`notification-service listening on ${PORT}`);
  runReadingReminder().catch((error) => console.error('Reading reminder failed:', error.message));
  setInterval(() => runReadingReminder().catch((error) => console.error('Reading reminder failed:', error.message)), 60 * 1000);
});
