import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardObservation } from '../lib/observation.mjs';

test('maps Weather Underground top-level humidity into the dashboard observation', () => {
  const result = dashboardObservation({
    humidity: 67,
    obsTimeLocal: '2026-10-15T09:30:00-04:00',
    imperial: { temp: 58.4, dewpt: 46.8 },
  });

  assert.equal(result.humidity, 67);
  assert.equal(result.temp, 58.4);
  assert.equal(result.dewpt, 46.8);
});

test('keeps zero humidity and accepts documented compatibility fallbacks', () => {
  assert.equal(dashboardObservation({ humidity: 0 }).humidity, 0);
  assert.equal(dashboardObservation({ relativeHumidity: 42 }).humidity, 42);
  assert.equal(dashboardObservation({ imperial: { humidity: 51 } }).humidity, 51);
});
