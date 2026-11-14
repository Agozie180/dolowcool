// Real signal source. The native SDK owns the default camera in Electron's main process.
const EventEmitter = require('events');

const VALIDATION_MESSAGES = {
  0: 'Signal is clear.',
  1: 'No face found. Face the camera and keep your head and upper chest visible.',
  2: 'More than one face is visible. Only one person should be in frame.',
  3: 'Center your face in the frame.',
  4: 'Move until your face fits comfortably in the frame.',
  5: 'The image is too dark. Add light in front of you.',
  6: 'The image is too bright. Reduce glare or strong backlighting.',
  7: 'Keep your upper chest visible to the camera.',
  10: 'Camera is tuning. Hold still for a moment.',
  11: 'Camera frame rate is too low for a reliable reading.',
  12: 'Too much movement. Hold still for a clearer reading.',
  13: 'Move a little farther from the camera.',
  14: 'Move a little closer to the camera.',
  15: 'Lower your face in the frame.',
  16: 'Raise your face in the frame.',
  17: 'Look toward the camera.',
};

const ERROR_MESSAGES = {
  2: 'SmartSpectra authentication failed. Check SMARTSPECTRA_API_KEY.',
  3: 'SmartSpectra rejected the measurement configuration.',
  4: 'SmartSpectra trial credits are exhausted.',
  5: 'SmartSpectra could not reach its service. Check your connection.',
  6: 'The SmartSpectra service returned an error.',
  7: 'The camera is unavailable or already in use.',
  8: 'SmartSpectra could not process the camera signal.',
  13: 'This API key is not authorized for a requested metric.',
  14: 'The camera frame rate stayed too low for measurement.',
};

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function lastValue(list) {
  return Array.isArray(list) && list.length ? finitePositive(list[list.length - 1]?.value) : null;
}

function friendlyError(code, message) {
  return ERROR_MESSAGES[code] || message || `SmartSpectra error ${code}.`;
}

module.exports = function createPresageSource({ sdkModule } = {}) {
  const em = new EventEmitter();
  let sdk = null;
  let stopped = true;
  let lastEmitAt = 0;

  em.start = async () => {
    if (!process.env.SMARTSPECTRA_API_KEY) throw new Error('Set SMARTSPECTRA_API_KEY first.');
    let lib = sdkModule;
    if (!lib) {
      try { lib = require('@smartspectra/node-sdk'); }
      catch (error) { throw new Error(`SmartSpectra SDK could not load: ${error.message}`); }
    }

    const {
      SmartSpectraSDK, CameraSelection, breathingMetrics, cardioMetrics,
      decodeMetrics, ValidationCode,
    } = lib;

    stopped = false;
    em.emit('status', { kind: 'lifecycle', message: 'Starting the camera…' });
    sdk = new SmartSpectraSDK({
      apiKey: process.env.SMARTSPECTRA_API_KEY,
      requestedMetrics: [...breathingMetrics, ...cardioMetrics],
      // Privacy-first default. Set DOLOWCOOL_TELEMETRY=1 to opt in explicitly.
      enableTelemetry: process.env.DOLOWCOOL_TELEMETRY === '1',
    });

    sdk.on('processingStatus', (status) => {
      if (!stopped) em.emit('status', {
        kind: 'lifecycle', status,
        message: status === 3 ? 'Camera is running.' : 'Camera status changed.',
      });
    });
    sdk.on('validationStatus', (code, _timestampUs, hint) => {
      if (stopped) return;
      const ok = code === (ValidationCode?.kOk ?? 0);
      em.emit('status', {
        kind: 'quality', ok, code,
        message: VALIDATION_MESSAGES[code] || hint || `Camera quality warning ${code}.`,
      });
    });
    sdk.on('metrics', (buffer) => {
      if (stopped) return;
      let metrics;
      try { metrics = decodeMetrics(buffer); }
      catch (error) {
        em.emit('error', new Error(`Could not read SmartSpectra metrics: ${error.message}`));
        return;
      }
      if (!metrics || Buffer.isBuffer(metrics)) return;

      const now = Date.now();
      if (now - lastEmitAt < 800) return;
      const pulse = lastValue(metrics.cardio?.pulseRate);
      const breath = lastValue(metrics.breathing?.rate);
      if (pulse === null && breath === null) return;
      lastEmitAt = now;
      em.emit('sample', { t: now, pulse, breath });
    });
    sdk.on('error', (code, message, retryable) => {
      if (stopped) return;
      const error = new Error(friendlyError(code, message));
      error.code = code;
      error.retryable = Boolean(retryable);
      em.emit('error', error);
    });

    try {
      sdk.useCamera(CameraSelection.default);
      sdk.start();
    } catch (error) {
      const failed = sdk;
      sdk = null;
      stopped = true;
      try { await failed.destroy(); } catch {}
      throw new Error(friendlyError(error.code, error.message));
    }
  };

  em.stop = async () => {
    stopped = true;
    const active = sdk;
    sdk = null;
    if (!active) return;
    try { await active.stopAsync(); } finally { await active.destroy(); }
  };

  return em;
};

module.exports._test = { finitePositive, lastValue, friendlyError };
