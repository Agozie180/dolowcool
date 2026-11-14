const test = require('node:test');
const assert = require('node:assert/strict');
const { LockEngine } = require('../renderer/lock.js');

function harness(options = {}) {
  const engine = new LockEngine({ baselineSeconds: 10, minBaselineSamples: 5, holdSeconds: 5, ...options });
  let t = 0;
  return {
    engine,
    tick(pulse, breath, advance = 1000) {
      t += advance;
      return engine.push({ t, pulse, breath });
    },
  };
}

test('baseline, hysteresis and sustained calm control the lock', () => {
  const { engine, tick } = harness();
  for (let i = 0; i < 11; i++) tick(70, 14);
  assert.equal(engine.state, 'unlocked');
  for (let i = 0; i < 5; i++) tick(71, 14.2);
  assert.equal(engine.state, 'unlocked');
  for (let i = 0; i < 6; i++) tick(95, 24);
  assert.equal(engine.state, 'locked');
  for (let i = 0; i < 3; i++) tick(70, 14);
  assert.equal(engine.state, 'locked');
  for (let i = 0; i < 12; i++) tick(70, 14);
  assert.equal(engine.state, 'unlocked');
});

test('a signal gap cannot count as a continuous calm hold', () => {
  const { engine, tick } = harness({ smoothing: 1 });
  for (let i = 0; i < 11; i++) tick(70, 14);
  tick(100, 24);
  tick(70, 14);
  assert.equal(engine.state, 'locked');

  const afterGap = tick(70, 14, 60000);
  assert.equal(afterGap.state, 'locked');
  assert.equal(afterGap.signalGap, true);
  assert.equal(afterGap.calmLeft, 5);

  for (let i = 0; i < 5; i++) tick(70, 14);
  assert.equal(engine.state, 'unlocked');
});

test('calibration waits for stable readings', () => {
  const { engine, tick } = harness({ baselineSeconds: 5, pulseMadLimit: 0.01, breathMadLimit: 0.01 });
  for (let i = 0; i < 7; i++) tick(i % 2 ? 90 : 60, i % 2 ? 20 : 10);
  assert.equal(engine.state, 'calibrating');
  assert.match(engine.calibrationReason, /moving around/);

  for (let i = 0; i < 7; i++) tick(70, 14);
  assert.equal(engine.state, 'unlocked');
  assert.equal(engine.base.pulse, 70);
  assert.equal(engine.base.breath, 14);
});

test('calibration restarts after interrupted samples', () => {
  const { engine, tick } = harness({ baselineSeconds: 5 });
  for (let i = 0; i < 4; i++) tick(70, 14);
  const interrupted = tick(70, 14, 8000);
  assert.equal(interrupted.state, 'calibrating');
  assert.equal(interrupted.calibrationProgress, 0);
  assert.match(interrupted.calibrationReason, /interrupted/);
});
