const $ = (id) => document.getElementById(id);
const n = (value, suffix = '') => value == null ? '—' : `${Math.round(value)}${suffix}`;
const icon = (text = '') => /thunder/i.test(text) ? '⛈️' : /snow|ice/i.test(text) ? '❄️' : /rain|shower/i.test(text) ? '🌧️' : /cloud/i.test(text) ? '☁️' : /fog/i.test(text) ? '🌫️' : /sun|clear/i.test(text) ? '☀️' : '🌤️';
function freshness(iso) { const minutes = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return minutes < 2 ? 'Updated just now' : `Updated ${minutes}m ago`; }
function periodTime(start) { return new Intl.DateTimeFormat([], { hour: 'numeric' }).format(new Date(start)); }
function dayName(start) { const d = new Date(start); return d.toDateString() === new Date().toDateString() ? 'Today' : new Intl.DateTimeFormat([], { weekday: 'short' }).format(d); }
let radar;
function radarTime(unixTime) { return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date(unixTime * 1000)); }
function setupRadar(location) {
  if (radar || !window.L || !location) return;
  const mapElement = $('radar-map'); const timeline = $('radar-timeline'); const timeOutput = $('radar-time'); const play = $('radar-play');
  const center = [location.latitude, location.longitude];
  const map = L.map(mapElement, { zoomControl: true, scrollWheelZoom: true, maxZoom: 7 }).setView(center, 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 7, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  L.marker(center, { icon: L.divIcon({ className: 'station-marker', html: '<span><b>⌖</b></span>', iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(map).bindTooltip('Weather239 station', { direction: 'top', offset: [0, -26] });
  const lakeLabel = L.marker([43.71, -77.72], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'lake-america-label', html: '<span>Lake America</span>', iconSize: [112, 22], iconAnchor: [56, 11] }) }).addTo(map);
  const fitRadar = () => { map.invalidateSize({ pan: false }); map.setView(center, map.getZoom(), { animate: false }); lakeLabel.setOpacity(map.getZoom() >= 6 ? 1 : 0); };
  const scheduleRadarFit = () => { requestAnimationFrame(() => requestAnimationFrame(fitRadar)); };
  const resizeObserver = window.ResizeObserver ? new ResizeObserver(scheduleRadarFit) : null; resizeObserver?.observe(mapElement);
  window.addEventListener('resize', scheduleRadarFit); window.addEventListener('orientationchange', () => setTimeout(scheduleRadarFit, 150));
  map.whenReady(() => { scheduleRadarFit(); setTimeout(scheduleRadarFit, 200); }); map.on('zoomend', fitRadar);
  radar = { map, layer: null, frames: [], playing: false, timer: null, fit: scheduleRadarFit, resizeObserver };
  fetch('https://api.rainviewer.com/public/weather-maps.json').then(response => { if (!response.ok) throw new Error('Radar service unavailable'); return response.json(); }).then(data => {
    radar.frames = data.radar?.past || []; if (!radar.frames.length) throw new Error('No recent radar frames available'); radar.host = data.host; timeline.max = String(radar.frames.length - 1); timeline.value = timeline.max; showRadarFrame(Number(timeline.value));
  }).catch(() => { mapElement.innerHTML = '<div class="radar-unavailable">Radar is temporarily unavailable. Please try again shortly.</div>'; });
  timeline.addEventListener('input', () => { stopRadar(); showRadarFrame(Number(timeline.value)); });
  play.addEventListener('click', () => radar.playing ? stopRadar() : playRadar());
  $('radar-fullscreen').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else $('radar-card').requestFullscreen?.(); });
  document.addEventListener('fullscreenchange', () => { $('radar-fullscreen').textContent = document.fullscreenElement ? '×' : '⛶'; scheduleRadarFit(); setTimeout(scheduleRadarFit, 150); });
}
function showRadarFrame(index) {
  if (!radar?.frames[index]) return; if (radar.layer) radar.map.removeLayer(radar.layer);
  const frame = radar.frames[index]; radar.layer = L.tileLayer(`${radar.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: .72, maxZoom: 7, zIndex: 10 }); radar.layer.addTo(radar.map); $('radar-timeline').value = String(index); $('radar-time').textContent = index === radar.frames.length - 1 ? `Latest · ${radarTime(frame.time)}` : radarTime(frame.time);
}
function stopRadar() { if (!radar) return; radar.playing = false; clearInterval(radar.timer); $('radar-play').textContent = '▶'; $('radar-play').setAttribute('aria-label', 'Play radar animation'); }
function playRadar() { if (!radar?.frames.length) return; radar.playing = true; $('radar-play').textContent = '❚❚'; $('radar-play').setAttribute('aria-label', 'Pause radar animation'); radar.timer = setInterval(() => { showRadarFrame((Number($('radar-timeline').value) + 1) % radar.frames.length); }, 650); }
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
  $('hourly').innerHTML = data.hourly.map(p => `<article><time>${periodTime(p.startTime)}</time><div class="icon">${icon(p.shortForecast)}</div><b>${p.temperature}°</b><small>${p.probabilityOfPrecipitation?.value ?? 0}%<span>rain</span></small></article>`).join('');
  const combined = []; for (const p of data.daily) { const day = dayName(p.startTime); const item = combined.find(x => x.day === day); if (item) { item.low = p.temperature; } else combined.push({ day, p, high: p.temperature, low: null }); }
  $('daily').innerHTML = combined.slice(0, 7).map(({ day, p, high, low }) => `<div class="day"><b>${day}</b><span>${icon(p.shortForecast)} ${p.shortForecast}</span><strong>${high}°</strong><strong>${low == null ? '—' : `${low}°`}</strong></div>`).join('');
  setupRadar(data.location);
  if (data.alerts.length) { const container = $('alerts'); container.hidden = false; container.innerHTML = data.alerts.map(a => `<article><b>${a.event} · ${a.severity}</b><p>${a.headline}</p></article>`).join(''); }
}
async function load() { $('status').textContent = 'Loading backyard conditions…'; try { const response = await fetch('/api/dashboard'); const data = await response.json(); if (!response.ok) throw new Error(data.error); render(data); } catch (error) { $('status').textContent = error.message; } }
$('refresh').onclick = load; load(); setInterval(load, 5 * 60 * 1000);
