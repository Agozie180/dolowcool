const test = require('node:test');
const assert = require('node:assert/strict');
const {
  VALIDATION_MESSAGES,
  RELIABILITY_THRESHOLDS,
  METRIC_FRESHNESS_MS,
  measurementIsReliable,
  updateMetricCache,
  freshMetricPoint,
} = require('../sources/presage.js');

test('every documented SmartSpectra validation state has actionable guidance', () => {
  const documentedCodes = [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17];
  assert.deepEqual(Object.keys(VALIDATION_MESSAGES).map(Number).sort((a, b) => a - b), documentedCodes);
  documentedCodes.filter((code) => code !== 0).forEach((code) => {
    assert.ok(VALIDATION_MESSAGES[code].length >= 20, `code ${code} needs useful guidance`);
  });
});

test('quality guidance avoids medical and emotion claims', () => {
  const copy = Object.values(VALIDATION_MESSAGES).join(' ').toLowerCase();
  ['anger', 'anxiety', 'stress', 'diagnos', 'treat', 'hypervent'].forEach((term) => {
    assert.equal(copy.includes(term), false, `guidance contains prohibited term: ${term}`);
  });
});

test('SDK confidence thresholds gate pulse and breathing reliability', () => {
  assert.deepEqual(RELIABILITY_THRESHOLDS, { pulse: 40, breath: 45 });
  assert.equal(measurementIsReliable({ value: 70, confidence: 39, stable: false }, 40), false);
  assert.equal(measurementIsReliable({ value: 70, confidence: 40, stable: false }, 40), true);
  assert.equal(measurementIsReliable({ value: 14, confidence: 44, stable: false }, 45), false);
  assert.equal(measurementIsReliable({ value: 14, confidence: 45, stable: false }, 45), true);
  assert.equal(measurementIsReliable({ value: 70, confidence: null, stable: false }, 40), false);
  assert.equal(measurementIsReliable({ value: 70, confidence: 0, stable: true }, 40), true);
  assert.equal(measurementIsReliable({ value: null, confidence: 100, stable: true }, 40), false);
});

test('pulse and breathing measurements merge across separate fresh packets', () => {
  const pulse = { value: 72, confidence: 48, stable: true };
  const breath = { value: 15, confidence: 51, stable: true };
  const pulseCache = updateMetricCache(null, pulse, 1000);
  const breathCache = updateMetricCache(null, breath, 1800);

  assert.equal(freshMetricPoint(pulseCache, 1800), pulse);
  assert.equal(freshMetricPoint(breathCache, 1800), breath);
  assert.equal(freshMetricPoint(pulseCache, 1000 + METRIC_FRESHNESS_MS + 1), null);
});
