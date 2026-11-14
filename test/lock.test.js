const assert = require('assert');
const { LockEngine } = require('../renderer/lock.js');
const e = new LockEngine({ baselineSeconds: 10, holdSeconds: 5 });
let t = 0; const tick = (pulse, breath) => e.push({ t: (t += 1000), pulse, breath });

for (let i = 0; i < 11; i++) tick(70, 14);
assert.strictEqual(e.state, 'unlocked', 'unlocked after baseline');
for (let i = 0; i < 5; i++) tick(71, 14.2);
assert.strictEqual(e.state, 'unlocked', 'small wobble does not lock');
for (let i = 0; i < 6; i++) tick(95, 24);
assert.strictEqual(e.state, 'locked', 'spike locks');
for (let i = 0; i < 3; i++) tick(70, 14);
assert.strictEqual(e.state, 'locked', 'still locked until calm is held');
for (let i = 0; i < 12; i++) tick(70, 14);
assert.strictEqual(e.state, 'unlocked', 'unlocks after sustained calm');
console.log('lock tests passed');
