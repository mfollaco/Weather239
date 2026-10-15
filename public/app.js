const $ = (id) => document.getElementById(id);
const n = (value, suffix = '') => value == null ? '—' : `${Math.round(value)}${suffix}`;
const icon = (text = '') => /thunder/i.test(text) ? '⛈️' : /snow|ice/i.test(text) ? '❄️' : /rain|shower/i.test(text) ? '🌧️' : /cloud/i.test(text) ? '☁️' : /fog/i.test(text) ? '🌫️' : /sun|clear/i.test(text) ? '☀️' : '🌤️';
function freshness(iso) { const minutes = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return minutes < 2 ? 'Updated just now' : `Updated ${minutes}m ago`; }
function periodTime(start) { return new Intl.DateTimeFormat([], { hour: 'numeric' }).format(new Date(start)); }
function dayName(start) { const d = new Date(start); return d.toDateString() === new Date().toDateString() ? 'Today' : new Intl.DateTimeFormat([], { weekday: 'short' }).format(d); }
function render(data) {
  const o = data.observation;
  $('condition').textContent = o.wxPhraseMedium || o.wxPhraseLong || 'Current conditions';
  $('temp').textContent = n(o.temp); $('feels').textContent = `Feels like ${n(o.heatIndex ?? o.windChill ?? o.temp, '°')}`;
  $('humidity').textContent = n(o.humidity, '%'); $('dew').textContent = n(o.dewpt, '°');
  $('wind').textContent = o.winddirCardinal ? `${o.winddirCardinal} ${n(o.windSpeed, ' mph')}` : n(o.windSpeed, ' mph');
  $('gust').textContent = n(o.windGust, ' mph');
  const trend = o.pressureTrend == null || o.pressureTrend === '' ? '' : ` ${Number(o.pressureTrend) > 0 ? '↗' : Number(o.pressureTrend) < 0 ? '↘' : '→'}`;
  $('pressure').textContent = o.pressure == null ? '—' : `${Number(o.pressure).toFixed(2)} in${trend}`;
  $('rain').textContent = o.precipTotal == null ? '—' : `${Number(o.precipTotal).toFixed(2)} in`;
  $('fresh').textContent = freshness(o.obsTimeLocal || o.obsTimeUtc); $('status').textContent = `Station observation · refreshed ${new Date(data.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  $('hourly').innerHTML = data.hourly.map(p => `<article><time>${periodTime(p.startTime)}</time><div class="icon">${icon(p.shortForecast)}</div><b>${p.temperature}°</b><small>${p.probabilityOfPrecipitation?.value ?? 0}% rain</small></article>`).join('');
  const combined = []; for (const p of data.daily) { const day = dayName(p.startTime); const item = combined.find(x => x.day === day); if (item) { item.low = p.temperature; } else combined.push({ day, p, high: p.temperature, low: null }); }
  $('daily').innerHTML = combined.slice(0, 7).map(({ day, p, high, low }) => `<div class="day"><b>${day}</b><span>${icon(p.shortForecast)} ${p.shortForecast}</span><strong>${high}°</strong><strong>${low == null ? '—' : `${low}°`}</strong></div>`).join('');
  if (data.alerts.length) { const container = $('alerts'); container.hidden = false; container.innerHTML = data.alerts.map(a => `<article><b>${a.event} · ${a.severity}</b><p>${a.headline}</p></article>`).join(''); }
}
async function load() { $('status').textContent = 'Loading backyard conditions…'; try { const response = await fetch('/api/dashboard'); const data = await response.json(); if (!response.ok) throw new Error(data.error); render(data); } catch (error) { $('status').textContent = error.message; } }
$('refresh').onclick = load; load(); setInterval(load, 5 * 60 * 1000);
