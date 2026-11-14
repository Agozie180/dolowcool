const test = require('node:test');
const assert = require('node:assert/strict');
const { HoldGate } = require('../renderer/hold-confirm.js');

test('override completes only after a continuous three-second hold', () => {
  const gate = new HoldGate(3000);
  gate.start(1000);
  assert.equal(gate.update(3999) < 1, true);
  assert.equal(gate.completed, false);
  assert.equal(gate.update(4000), 1);
  assert.equal(gate.completed, true);
});

test('releasing early resets override progress', () => {
  const gate = new HoldGate(3000);
  gate.start(0);
  assert.equal(gate.update(1500), 0.5);
  gate.cancel();
  assert.equal(gate.update(5000), 0);
  assert.equal(gate.completed, false);
});
