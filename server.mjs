import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

function loadEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !match[2].startsWith('#') && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '');
    }
  }
}
loadEnv();

const config = {
  key: process.env.WU_API_KEY,
  station: 'KNYIROND36',
  latitude: process.env.LATITUDE || '43.2087',
  longitude: process.env.LONGITUDE || '-77.5364',
};
const cache = new Map();

async function fetchJson(url, options = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.time < 120000) return hit.value;
  const response = await fetch(url, { headers: { 'User-Agent': 'MikesWeatherDashboard/1.0 contact: local-dashboard' }, ...options });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const value = await response.json();
  cache.set(url, { time: Date.now(), value });
  return value;
}

async function dashboard() {
  if (!config.key || config.key === 'replace-with-your-key') {
    throw new Error('Weather Underground key not configured. Add WU_API_KEY to .env.');
  }
  const wuUrl = new URL('https://api.weather.com/v2/pws/observations/current');
  wuUrl.search = new URLSearchParams({ stationId: config.station, format: 'json', units: 'e', numericPrecision: 'decimal', apiKey: config.key });
  const pointsUrl = `https://api.weather.gov/points/${config.latitude},${config.longitude}`;
  const [wu, point] = await Promise.all([fetchJson(wuUrl), fetchJson(pointsUrl)]);
  const [hourly, sevenDay, alerts] = await Promise.all([
    fetchJson(point.properties.forecastHourly),
    fetchJson(point.properties.forecast),
    fetchJson(`https://api.weather.gov/alerts/active?point=${config.latitude},${config.longitude}`),
  ]);
  const observation = wu.observations?.[0];
  if (!observation) throw new Error('Weather Underground returned no observation for this station.');
  return {
    station: config.station,
    observation: {
      ...observation.imperial,
      obsTimeLocal: observation.obsTimeLocal,
      obsTimeUtc: observation.obsTimeUtc,
      solarRadiation: observation.solarRadiation,
      pressureTrend: observation.pressureTrend,
    },
    hourly: hourly.properties.periods.slice(0, 24),
    daily: sevenDay.properties.periods.slice(0, 14),
    alerts: alerts.features.map(({ properties }) => ({ event: properties.event, headline: properties.headline, severity: properties.severity, description: properties.description, expires: properties.expires })),
    updatedAt: new Date().toISOString(),
  };
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
http.createServer(async (req, res) => {
  if (req.url === '/api/dashboard') {
    try {
      const data = await dashboard();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const safePath = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
  const path = join(root, 'public', safePath);
  if (!path.startsWith(join(root, 'public')) || !existsSync(path)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Weather dashboard: http://localhost:${process.env.PORT || 3000}`));
