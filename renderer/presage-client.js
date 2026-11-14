import {
  SmartSpectraSDK,
  ValidationCode,
  ProcessingStatus,
  MetricType,
} from '@smartspectra/node-sdk/renderer';
import { decodeMetrics } from '@smartspectra/node-sdk/messages';

const VALIDATION_MESSAGES = {
  0: 'Signal is clear.',
  1: 'No face found. Look toward the camera.',
  2: 'More than one face is visible.',
  3: 'Center your face inside the guide.',
  4: 'Adjust your distance from the camera.',
  5: 'Too dark. Add soft light in front of you.',
  6: 'Too bright. Reduce glare or backlighting.',
  7: 'Keep your face and upper chest visible.',
  10: 'Camera is tuning. Hold still.',
  11: 'Camera frame rate is too low.',
  12: 'Too much movement. Hold still.',
  13: 'Move a little farther away.',
  14: 'Move a little closer.',
  15: 'Lower your face inside the guide.',
  16: 'Raise your face inside the guide.',
  17: 'Face the camera directly.',
};

const ERROR_MESSAGES = {
  2: 'SmartSpectra authentication failed. Check SMARTSPECTRA_API_KEY.',
  3: 'SmartSpectra rejected the measurement configuration.',
  4: 'SmartSpectra trial credits are exhausted.',
  5: 'SmartSpectra could not reach its service.',
  6: 'The SmartSpectra service returned an error.',
  7: 'The camera is unavailable or already in use.',
  8: 'SmartSpectra could not process the camera signal.',
  13: 'This API key cannot access a requested metric.',
  14: 'The camera frame rate stayed too low.',
};

const latest = (values) => Array.isArray(values) && values.length ? values[values.length - 1] : null;
const finitePositive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

function createClient(callbacks) {
  let sdk = null;
  let cameraStream = null;
  let lastEmitAt = 0;

  return {
    async start(options) {
      sdk = new SmartSpectraSDK({
        apiKey: options.apiKey,
        requestedMetrics: [MetricType.BREATHING_RATE, MetricType.PULSE_RATE],
        enableTelemetry: Boolean(options.enableTelemetry),
        sendTimeoutMs: 30000,
      });

      sdk.on('streamAvailable', (stream) => callbacks.onStream?.(stream));
      sdk.on('processingStatus', (status) => callbacks.onStatus?.({
        kind: 'lifecycle',
        status,
        message: status === ProcessingStatus.kRunning ? 'Camera is running.' : 'Starting measurement…',
      }));
      sdk.on('validationStatus', (code, _timestampUs, hint) => callbacks.onStatus?.({
        kind: 'quality',
        ok: code === ValidationCode.kOk,
        code,
        message: VALIDATION_MESSAGES[code] || hint || `Camera quality warning ${code}.`,
      }));
      sdk.on('metrics', (buffer) => {
        const now = Date.now();
        let metrics;
        try { metrics = decodeMetrics(buffer); }
        catch (error) { callbacks.onError?.(`Could not read metrics: ${error.message}`); return; }

        const pulsePoint = latest(metrics?.cardio?.pulseRate);
        const breathPoint = latest(metrics?.breathing?.rate);
        const pulse = finitePositive(pulsePoint?.value);
        const breath = finitePositive(breathPoint?.value);
        callbacks.onMetricsPacket?.({
          pulsePresent: pulse !== null,
          breathPresent: breath !== null,
        });
        if (now - lastEmitAt < 750) return;
        if (pulse === null && breath === null) return;
        lastEmitAt = now;
        callbacks.onSample?.({
          t: now,
          pulse,
          breath,
          pulseConfidence: Number.isFinite(pulsePoint?.confidence) ? pulsePoint.confidence : null,
          breathConfidence: Number.isFinite(breathPoint?.confidence) ? breathPoint.confidence : null,
        });
      });
      sdk.on('error', (code, message, retryable) => callbacks.onError?.(
        ERROR_MESSAGES[code] || message || `SmartSpectra error ${code}.`,
        { code, retryable: Boolean(retryable) },
      ));

      // On lower-powered Windows systems, cloning and IPC-copying 720p RGBA
      // frames can fall below SmartSpectra's sustained-FPS requirement. Own a
      // 640x480/30 stream explicitly so preview and measurement share a live
      // camera source while keeping the renderer-to-main frame path light.
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
      });
      callbacks.onStream?.(cameraStream);
      sdk.useMediaStream(cameraStream);
      await sdk.start();
    },

    async stop() {
      const active = sdk;
      sdk = null;
      try {
        if (active) await active.stop();
      } finally {
        if (active) active.destroy();
        if (cameraStream) {
          for (const track of cameraStream.getTracks()) track.stop();
          cameraStream = null;
        }
      }
    },
  };
}

window.DolowcoolPresage = { createClient };
