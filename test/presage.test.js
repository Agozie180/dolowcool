const test = require('node:test');
const assert = require('node:assert/strict');
const createPresageSource = require('../sources/presage');

class FakeSDK {
  constructor(options) { this.options = options; this.handlers = {}; FakeSDK.instance = this; }
  on(name, handler) { this.handlers[name] = handler; return this; }
  useCamera(selection) { this.selection = selection; return this; }
  start() { this.started = true; }
  async stopAsync() { this.stopped = true; }
  async destroy() { this.destroyed = true; }
}

const fakeModule = {
  SmartSpectraSDK: FakeSDK,
  CameraSelection: { default: { kind: 'default' } },
  breathingMetrics: [1, 2, 3],
  cardioMetrics: [4, 5, 6],
  ValidationCode: { kOk: 0 },
  decodeMetrics: (value) => value,
};

test('Presage source requests live pulse and breathing with telemetry off', async () => {
  const oldKey = process.env.SMARTSPECTRA_API_KEY;
  process.env.SMARTSPECTRA_API_KEY = 'test-key';
  try {
    const source = createPresageSource({ sdkModule: fakeModule });
    const samples = [];
    const statuses = [];
    source.on('sample', (sample) => samples.push(sample));
    source.on('status', (status) => statuses.push(status));

    await source.start();
    const sdk = FakeSDK.instance;
    assert.equal(sdk.options.apiKey, 'test-key');
    assert.deepEqual(sdk.options.requestedMetrics, [1, 2, 3, 4, 5, 6]);
    assert.equal(sdk.options.enableTelemetry, false);
    assert.deepEqual(sdk.selection, { kind: 'default' });
    assert.equal(sdk.started, true);

    sdk.handlers.validationStatus(0, 1, 'ok');
    sdk.handlers.metrics({
      breathing: { rate: [{ value: 14.2 }] },
      cardio: { pulseRate: [{ value: 72 }] },
    });
    assert.equal(statuses.at(-1).ok, true);
    assert.equal(samples.length, 1);
    assert.equal(samples[0].pulse, 72);
    assert.equal(samples[0].breath, 14.2);

    await source.stop();
    assert.equal(sdk.stopped, true);
    assert.equal(sdk.destroyed, true);
  } finally {
    if (oldKey === undefined) delete process.env.SMARTSPECTRA_API_KEY;
    else process.env.SMARTSPECTRA_API_KEY = oldKey;
  }
});

test('Presage source requires an API key', async () => {
  const oldKey = process.env.SMARTSPECTRA_API_KEY;
  delete process.env.SMARTSPECTRA_API_KEY;
  try {
    const source = createPresageSource({ sdkModule: fakeModule });
    await assert.rejects(source.start(), /SMARTSPECTRA_API_KEY/);
  } finally {
    if (oldKey !== undefined) process.env.SMARTSPECTRA_API_KEY = oldKey;
  }
});
