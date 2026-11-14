const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionRecap } = require('../renderer/session-recap.js');

test('recap records relative score plus pause and unlock markers', () => {
  const recap = new SessionRecap();
  recap.reset(1000);
  recap.record({ state: 'calibrating', score: 0 }, 1000);
  recap.record({ state: 'unlocked', score: 0.2 }, 3000);
  recap.record({ state: 'locked', score: 1.2 }, 5000);
  recap.record({ state: 'locked', score: 0.4 }, 9000);
  recap.record({ state: 'unlocked', score: 0.3 }, 12000);
  const summary = recap.end(13000);
  assert.equal(summary.waitedMs, 7000);
  assert.deepEqual(summary.markers, [
    { elapsedMs: 4000, type: 'pause' },
    { elapsedMs: 11000, type: 'unlock' },
  ]);
  assert.deepEqual(Object.keys(summary.points[0]).sort(), ['elapsedMs', 'score']);
});

test('ending while paused counts the unfinished wait and clear discards it', () => {
  const recap = new SessionRecap();
  recap.reset(0);
  recap.record({ state: 'locked', score: 1.1 }, 2000);
  assert.equal(recap.end(7000).waitedMs, 5000);
  recap.clear();
  assert.equal(recap.points.length, 0);
  assert.equal(recap.markers.length, 0);
  assert.equal(recap.startAt, null);
});
