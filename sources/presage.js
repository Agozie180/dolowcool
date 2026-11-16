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
  1: 'Move into view, then step back so your face and upper chest are visible.',
  2: 'Keep only one person in the camera view.',
  3: 'Move left or right until your face is centered in the guide.',
  4: 'Move a little closer or farther away until your face fits the guide.',
  5: 'Too dark. Add soft light in front of you.',
  6: 'Too bright. Reduce glare or move away from strong backlighting.',
  7: 'Step back until your face, shoulders, and upper chest are visible.',
  10: 'Camera is tuning. Hold still.',
  11: 'Camera frame rate is too low. Close other camera apps and keep this window active.',
  12: 'Too much movement. Rest the camera and hold comfortably still.',
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

// SmartSpectra documents these as the minimum accepted-accuracy confidence
// levels for pulse (+/-3 bpm) and breathing (+/-1 br/min).
const RELIABILITY_THRESHOLDS = Object.freeze({ pulse: 40, breath: 45 });
const METRIC_FRESHNESS_MS = 8000;

const latest = (values) => Array.isArray(values) && values.length ? values[values.length - 1] : null;
const finitePositive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const finiteConfidence = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const measurementIsReliable = (point, minimumConfidence) => {
  if (!point || finitePositive(point.value) === null) return false;
  const confidence = finiteConfidence(point.confidence);
  return point.stable === true || (confidence !== null && confidence >= minimumConfidence);
};
const updateMetricCache = (cache, point, receivedAt) => finitePositive(point?.value) === null
  ? cache
  : { point, receivedAt };
const freshMetricPoint = (cache, now, maxAgeMs = METRIC_FRESHNESS_MS) => (
  cache && now - cache.receivedAt <= maxAgeMs ? cache.point : null
);

function createPresageSource(options = {}) {
  const em = new EventEmitter();
  let sdk = null;
  let lastSampleAt = 0;
  let lastPreviewAt = 0;
  let lastValidationAt = 0;
  let lastValidationCode = null;
  let pulseCache = null;
  let breathCache = null;
  let streamAnnounced = false;

  em.start = async () => {
    if (sdk) return;
    if (!options.apiKey) throw new Error('Set SMARTSPECTRA_API_KEY first.');

    const cameras = SmartSpectraSDK.availableCameras();
    const configuredId = process.env.DOLOWCOOL_CAMERA_ID;
    const camera = cameras.find((item) => configuredId && item.id === configuredId)
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
    active.on('validationStatus', (code, _timestampUs, hint) => {
      const now = Date.now();
      if (code === lastValidationCode && now - lastValidationAt < 1000) return;
      lastValidationCode = code;
      lastValidationAt = now;
      em.emit('status', {
        kind: 'quality',
        ok: code === ValidationCode.kOk,
        code,
        message: VALIDATION_MESSAGES[code] || hint || `Camera quality warning ${code}.`,
      });
    });
    active.on('frameSentThrough', (sent) => {
      if (!sent || streamAnnounced) return;
      streamAnnounced = true;
      em.emit('status', { kind: 'stream', available: true });
    });
    active.on('videoOutput', (buffer, width, height, stride, pixelFormat) => {
      const now = Date.now();
      if (now - lastPreviewAt < 300) return;
      lastPreviewAt = now;
      em.emit('frame', { buffer, width, height, stride, pixelFormat });
    });
    active.on('metrics', (buffer) => {
      let metrics;
      try { metrics = decodeMetrics(buffer); }
      catch (error) { em.emit('error', Object.assign(new Error(`Could not read metrics: ${error.message}`), { code: 'decode' })); return; }

      const now = Date.now();
      pulseCache = updateMetricCache(pulseCache, latest(metrics?.cardio?.pulseRate), now);
      breathCache = updateMetricCache(breathCache, latest(metrics?.breathing?.rate), now);
      const pulsePoint = freshMetricPoint(pulseCache, now);
      const breathPoint = freshMetricPoint(breathCache, now);
      const pulse = finitePositive(pulsePoint?.value);
      const breath = finitePositive(breathPoint?.value);
      const pulseConfidence = finiteConfidence(pulsePoint?.confidence);
      const breathConfidence = finiteConfidence(breathPoint?.confidence);
      const pulseStable = measurementIsReliable(pulsePoint, RELIABILITY_THRESHOLDS.pulse);
      const breathStable = measurementIsReliable(breathPoint, RELIABILITY_THRESHOLDS.breath);
      em.emit('status', {
        kind: 'metrics',
        pulsePresent: pulse !== null,
        breathPresent: breath !== null,
        pulseReliable: pulseStable,
        breathReliable: breathStable,
        pulseConfidence,
        breathConfidence,
      });

      if (now - lastSampleAt < 750 || (pulse === null && breath === null)) return;
      lastSampleAt = now;
      em.emit('sample', {
        t: now,
        pulse,
        breath,
        pulseConfidence,
        breathConfidence,
        pulseStable,
        breathStable,
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
}

module.exports = createPresageSource;
module.exports.VALIDATION_MESSAGES = VALIDATION_MESSAGES;
module.exports.RELIABILITY_THRESHOLDS = RELIABILITY_THRESHOLDS;
module.exports.METRIC_FRESHNESS_MS = METRIC_FRESHNESS_MS;
module.exports.measurementIsReliable = measurementIsReliable;
module.exports.updateMetricCache = updateMetricCache;
module.exports.freshMetricPoint = freshMetricPoint;
