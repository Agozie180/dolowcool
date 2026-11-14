const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  SmartSpectraSDK,
  CameraSelection,
  MetricType,
  ProcessingStatus,
  ValidationCode,
  decodeMetrics,
} = require('@smartspectra/node-sdk');

const timeoutMs = Number(process.env.DOLOWCOOL_LIVE_TIMEOUT_MS || 45000);
const latest = (values) => Array.isArray(values) && values.length ? values[values.length - 1] : null;
const present = (point) => Number.isFinite(Number(point?.value)) && Number(point.value) > 0;

async function main() {
  if (!process.env.SMARTSPECTRA_API_KEY) throw new Error('Set SMARTSPECTRA_API_KEY in .env first.');

  const cameras = SmartSpectraSDK.availableCameras();
  const camera = cameras.find((item) => item.name === 'HP HD Camera') || cameras[0];
  if (!camera) throw new Error('No camera was discovered by SmartSpectra.');

  const result = {
    stream: false,
    running: false,
    validationCode: null,
    validationOk: false,
    metricsPackets: 0,
    pulseReceived: false,
    breathReceived: false,
    videoOutputFrames: 0,
    error: null,
  };

  const sdk = new SmartSpectraSDK({
    apiKey: process.env.SMARTSPECTRA_API_KEY,
    requestedMetrics: [MetricType.BREATHING_RATE, MetricType.PULSE_RATE],
    enableTelemetry: false,
  });

  let finish;
  const complete = new Promise((resolve) => { finish = resolve; });
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    finish();
  };

  sdk.on('processingStatus', (status) => {
    if (status === ProcessingStatus.kRunning) result.running = true;
  });
  sdk.on('validationStatus', (code) => {
    result.validationCode = code;
    result.validationOk = code === ValidationCode.kOk;
  });
  sdk.on('metrics', (buffer) => {
    result.metricsPackets += 1;
    const metrics = decodeMetrics(buffer);
    result.pulseReceived ||= present(latest(metrics?.cardio?.pulseRate));
    result.breathReceived ||= present(latest(metrics?.breathing?.rate));
    if (result.pulseReceived && result.breathReceived) settle();
  });
  sdk.on('videoOutput', () => { result.videoOutputFrames += 1; });
  sdk.on('frameSentThrough', (sent) => { if (sent) result.stream = true; });
  sdk.on('error', (code, message, retryable) => {
    result.error = { code, message, retryable: Boolean(retryable) };
    settle();
  });

  const timer = setTimeout(settle, timeoutMs);
  try {
    sdk.useCamera(CameraSelection.byId(camera.id), { width: 1280, height: 720, fps: 30 });
    sdk.start();
    await complete;
  } finally {
    clearTimeout(timer);
    try { await sdk.stopAsync(); } catch {}
    await sdk.destroy();
  }

  const summary = [
    `RESULT=${result.pulseReceived && result.breathReceived ? 'PASSED' : 'FAILED'}`,
    `STREAM=${result.stream}`,
    `RUNNING=${result.running}`,
    `VALIDATION_OK=${result.validationOk}`,
    `VALIDATION_CODE=${result.validationCode ?? 'none'}`,
    `METRICS_PACKETS=${result.metricsPackets}`,
    `PULSE_RECEIVED=${result.pulseReceived}`,
    `BREATH_RECEIVED=${result.breathReceived}`,
    `VIDEO_OUTPUT_FRAMES=${result.videoOutputFrames}`,
  ];
  if (result.error) summary.push(
    `ERROR_CODE=${result.error.code}`,
    `ERROR_RETRYABLE=${result.error.retryable}`,
    `ERROR_MESSAGE=${JSON.stringify(result.error.message)}`,
  );
  console.log(summary.join(' '));
  process.exitCode = result.pulseReceived && result.breathReceived ? 0 : 1;
}

main().catch((error) => {
  console.error(`RESULT=FAILED REASON=${error.message || error}`);
  process.exitCode = 1;
});
