const test = require('node:test');
const assert = require('node:assert/strict');
const { STEPS, run } = require('../renderer/demo-scenario.js');

test('judge scenario covers baseline, rise, pause, settling and completion in about one minute', () => {
  assert.deepEqual(STEPS.map((step) => step.label), [
    'Learning a settled baseline',
    'Simulating a rise',
    'Pause active',
    'Simulating settled readings',
    'Scenario complete',
  ]);
  assert.ok(STEPS.at(-1).at >= 55000 && STEPS.at(-1).at <= 65000);
  assert.equal(STEPS[0].level, 0);
  assert.ok(STEPS.some((step) => step.level >= 0.9));
  assert.equal(STEPS.at(-1).level, 0);
});

test('judge scenario drives the simulator through the declared schedule', () => {
  const queued = [];
  const seen = [];
  let done = false;
  run({
    schedule(fn, delay) { queued.push({ fn, delay }); return delay; },
    cancelSchedule() {},
    setLevel(level) { seen.push(level); },
    onDone() { done = true; },
  });
  queued.sort((a, b) => a.delay - b.delay).forEach((item) => item.fn());
  assert.deepEqual(seen, STEPS.map((step) => step.level));
  assert.equal(done, true);
});
