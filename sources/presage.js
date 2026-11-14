const EventEmitter = require('node:events');
const {
  SmartSpectraSDK,
  CameraSelection,
  MetricType,
  ProcessingStatus,
  ValidationCode,
  decodeMetrics,
} = require('@smartspectra/node-sdk');

const VALIDATION_MESSAGES = {
  0: 'Signal is clear.',
  1: 'No face found. Sit in front of the camera.',
  2: 'More than one face is visible.',
  3: 'Center your face inside the guide.',
  4: 'Adjust your distance from the camera.',
  5: 'Too dark. Add soft light in front of you.',
  6: 'Too bright. Reduce glare or backlighting.',
  7: 'Step back until your face, shoulders, and upper chest are visible.',
  10: 'Camera is tuning. Hold still.',
  11: 'Camera frame rate is too low.',
  12: 'Too much movement. Hold still.',
  13: 'Move a little farther away.',
  14: 'Move a little closer.',
  15: 'Lower your face inside the guide.',
  16: 'Raise your face inside the guide.',
  17: 'Face the camera directly.',
};

const PROCESSING_MESSAGES = {
  [ProcessingStatus.kUninitialized]: 'Preparing SmartSpectra…',
  [ProcessingStatus.kIdle]: 'Camera is ready.',
  [ProcessingStatus.kStarting]: 'Starting measurement…',
  [ProcessingStatus.kRunning]: 'Camera is running.',
  [ProcessingStatus.kStopping]: 'Stopping camera…',
  [ProcessingStatus.kError]: 'SmartSpectra stopped.',
};

const latest = (values) => Array.isArray(values) && values.length ? values[values.length - 1] : null;
const finitePositive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

module.exports = function createPresageSource(options = {}) {
  const em = new EventEmitter();
  let sdk = null;
  let lastSampleAt = 0;
  let lastPreviewAt = 0;
  let streamAnnounced = false;

  em.start = async () => {
    if (sdk) return;
    if (!options.apiKey) throw new Error('Set SMARTSPECTRA_API_KEY first.');

    const cameras = SmartSpectraSDK.availableCameras();
    const configuredId = process.env.DOLOWCOOL_CAMERA_ID;
    const camera = cameras.find((item) => configuredId && item.id === configuredId)
      || cameras.find((item) => item.name === 'HP HD Camera')
      || cameras[0];
    if (!camera) throw new Error('SmartSpectra did not discover a camera.');

    const active = new SmartSpectraSDK({
      apiKey: options.apiKey,
      requestedMetrics: [MetricType.BREATHING_RATE, MetricType.PULSE_RATE],
      enableTelemetry: Boolean(options.enableTelemetry),
    });
    sdk = active;

    active.on('processingStatus', (status) => em.emit('status', {
      kind: 'lifecycle',
      status,
      message: PROCESSING_MESSAGES[status] || `SmartSpectra status ${status}.`,
    }));
    active.on('validationStatus', (code, _timestampUs, hint) => em.emit('status', {
      kind: 'quality',
      ok: code === ValidationCode.kOk,
      code,
      message: VALIDATION_MESSAGES[code] || hint || `Camera quality warning ${code}.`,
    }));
    active.on('frameSentThrough', (sent) => {
      if (!sent || streamAnnounced) return;
      streamAnnounced = true;
      em.emit('status', { kind: 'stream', available: true });
    });
    active.on('videoOutput', (buffer, width, height, stride, pixelFormat) => {
      const now = Date.now();
      if (now - lastPreviewAt < 200) return;
      lastPreviewAt = now;
      em.emit('frame', { buffer, width, height, stride, pixelFormat });
    });
    active.on('metrics', (buffer) => {
      let metrics;
      try { metrics = decodeMetrics(buffer); }
      catch (error) { em.emit('error', Object.assign(new Error(`Could not read metrics: ${error.message}`), { code: 'decode' })); return; }

      const pulsePoint = latest(metrics?.cardio?.pulseRate);
      const breathPoint = latest(metrics?.breathing?.rate);
      const pulse = finitePositive(pulsePoint?.value);
      const breath = finitePositive(breathPoint?.value);
      em.emit('status', { kind: 'metrics', pulsePresent: pulse !== null, breathPresent: breath !== null });

      const now = Date.now();
      if (now - lastSampleAt < 750 || (pulse === null && breath === null)) return;
      lastSampleAt = now;
      em.emit('sample', {
        t: now,
        pulse,
        breath,
        pulseConfidence: Number.isFinite(pulsePoint?.confidence) ? pulsePoint.confidence : null,
        breathConfidence: Number.isFinite(breathPoint?.confidence) ? breathPoint.confidence : null,
      });
    });
    active.on('error', (code, message, retryable) => {
      em.emit('error', Object.assign(new Error(message || `SmartSpectra error ${code}.`), {
        code,
        retryable: Boolean(retryable),
      }));
    });

    try {
      active.useCamera(CameraSelection.byId(camera.id), { width: 1280, height: 720, fps: 30 });
      active.start();
    } catch (error) {
      sdk = null;
      await active.destroy();
      throw error;
    }
  };

  em.stop = async () => {
    const active = sdk;
    sdk = null;
    if (!active) return;
    try { await active.stopAsync(); }
    finally { await active.destroy(); }
  };

  return em;
};
