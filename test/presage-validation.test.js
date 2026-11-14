const test = require('node:test');
const assert = require('node:assert/strict');
const { VALIDATION_MESSAGES } = require('../sources/presage.js');

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
