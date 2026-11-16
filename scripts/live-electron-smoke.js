const assert = require('node:assert/strict');
const { app } = require('electron');
const main = require('../main');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const liveTimeoutMs = Number(process.env.DOLOWCOOL_LIVE_TIMEOUT_MS || 90000);
const expectMetrics = process.env.DOLOWCOOL_EXPECT_METRICS !== '0';

async function waitFor(check, message, timeoutMs = liveTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await wait(100);
  }
  throw new Error(message);
}

const readDiagnostics = (win) => win.webContents.executeJavaScript(`(() => ({
  processingStatus: document.body.dataset.sdkProcessingStatus || 'unknown',
  hasStream: document.body.dataset.sdkStreamAvailable === 'true',
  validationCode: document.body.dataset.sdkValidationCode || 'none',
  validationMessage: document.body.dataset.sdkValidationMessage || 'none',
  validationCount: Number(document.body.dataset.sdkValidationCount || 0),
  metricsPacketCount: Number(document.body.dataset.sdkMetricsPacketCount || 0),
  metricsPulsePresent: document.body.dataset.sdkMetricsPulsePresent === 'true',
  metricsBreathPresent: document.body.dataset.sdkMetricsBreathPresent === 'true',
  metricsPulseReliable: document.body.dataset.sdkMetricsPulseReliable === 'true',
  metricsBreathReliable: document.body.dataset.sdkMetricsBreathReliable === 'true',
  pulseConfidence: document.body.dataset.sdkPulseConfidence || 'none',
  breathConfidence: document.body.dataset.sdkBreathConfidence || 'none',
  pulseConfidenceMax: document.body.dataset.sdkPulseConfidenceMax || 'none',
  breathConfidenceMax: document.body.dataset.sdkBreathConfidenceMax || 'none',
  quality: document.getElementById('qualityPill').textContent.trim(),
  status: document.getElementById('status').textContent.trim(),
}))()`);

async function stopAndReturnToConsent(win) {
  const state = await win.webContents.executeJavaScript(`({
    appVisible: !document.getElementById('app').classList.contains('hidden'),
    consentVisible: !document.getElementById('consent').classList.contains('hidden')
  })`);
  if (state.appVisible) {
    await win.webContents.executeJavaScript(`document.getElementById('stop').click()`);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('recap').classList.contains('hidden')`
    ), 'Live session did not show its recap while stopping.', 10000);
    await win.webContents.executeJavaScript(`document.getElementById('recapDone').click()`);
  }
  await waitFor(async () => win.webContents.executeJavaScript(
    `!document.getElementById('consent').classList.contains('hidden')`
  ), 'Live session did not return to consent.', 10000);
}

app.whenReady().then(async () => {
  let win;
  try {
    await waitFor(() => main.getWindow(), 'Electron window was not created.');
    win = main.getWindow();
    await waitFor(() => !win.webContents.isLoading(), 'Renderer did not finish loading.');

    await win.webContents.executeJavaScript(`
      document.getElementById('agree').click();
      document.getElementById('start').click();
    `);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('app').classList.contains('hidden')`
    ), 'Live workspace did not open.');
    const composerState = await win.webContents.executeJavaScript(`(() => {
      const recipient = document.getElementById('recipient');
      const subject = document.getElementById('subject');
      const message = document.getElementById('msg');
      recipient.value = 'alex@example.com';
      subject.value = 'A message to review';
      message.value = 'I can keep writing while the live camera session measures both signals.';
      message.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        recipient: recipient.value,
        subject: subject.value,
        message: message.value,
        charCount: document.getElementById('charCount').textContent,
      };
    })()`);
    assert.equal(composerState.recipient, 'alex@example.com');
    assert.equal(composerState.subject, 'A message to review');
    assert.match(composerState.message, /keep writing/);
    assert.match(composerState.charCount, /^\d+ \/ 8000$/);

    let result;
    try {
      result = await waitFor(async () => win.webContents.executeJavaScript(`(() => {
      const expectMetrics = ${expectMetrics};
      const error = document.getElementById('startErr').textContent.trim();
      if (error) return { kind: 'error', message: error };
      const sdkError = document.body.dataset.sdkErrorMessage;
      if (sdkError) return {
        kind: 'error',
        code: document.body.dataset.sdkErrorCode || 'unknown',
        message: sdkError,
        retryable: document.body.dataset.sdkErrorRetryable === 'true',
        processingStatus: document.body.dataset.sdkProcessingStatus || 'unknown',
        hasStream: document.body.dataset.sdkStreamAvailable === 'true',
      };
      const status = document.getElementById('status').textContent.trim();
      const quality = document.getElementById('qualityPill').textContent.trim();
      const hasStream = document.body.dataset.sdkStreamAvailable === 'true'
        && document.body.dataset.previewFrameReceived === 'true';
      const pulseReceived = document.body.dataset.sdkPulseReceived === 'true';
      const breathReceived = document.body.dataset.sdkBreathReceived === 'true';
      const pulseReliable = document.body.dataset.sdkMetricsPulseReliable === 'true';
      const breathReliable = document.body.dataset.sdkMetricsBreathReliable === 'true';
      const validationReceived = Number(document.body.dataset.sdkValidationCount || 0) > 0;
      if (!expectMetrics && hasStream && validationReceived) {
        return { kind: 'transport', status, quality, hasStream, pulseReceived, breathReceived, pulseReliable, breathReliable };
      }
      if (hasStream && pulseReceived && breathReceived && pulseReliable && breathReliable) {
        return { kind: 'metrics', status, quality, hasStream, pulseReceived, breathReceived, pulseReliable, breathReliable };
      }
      return null;
      })()`), 'Live SmartSpectra session did not produce both reliable requested metrics.');
    } catch (error) {
      const diagnostics = await readDiagnostics(win);
      throw new Error(`${error.message} DIAGNOSTICS=${JSON.stringify(diagnostics)}`);
    }

    assert.equal(
      result.kind,
      expectMetrics ? 'metrics' : 'transport',
      result.kind === 'error'
        ? `SDK_ERROR_CODE=${result.code || 'unknown'} PROCESSING_STATUS=${result.processingStatus || 'unknown'} STREAM=${Boolean(result.hasStream)} RETRYABLE=${Boolean(result.retryable)} MESSAGE=${result.message}`
        : 'Live source failed.',
    );
    await stopAndReturnToConsent(win);
    console.log(`RESULT=PASSED MODE=${expectMetrics ? 'metrics' : 'transport'} STREAM=${result.hasStream} PULSE_RECEIVED=${result.pulseReceived} BREATH_RECEIVED=${result.breathReceived} PULSE_RELIABLE=${result.pulseReliable} BREATH_RELIABLE=${result.breathReliable} COMPOSER_RESPONSIVE=true QUALITY=${result.quality}`);
    await wait(1000);
    app.exit(0);
  } catch (error) {
    if (win && !win.isDestroyed()) {
      try { await stopAndReturnToConsent(win); } catch {}
    }
    console.error(`RESULT=FAILED REASON=${error.message}`);
    await wait(1000);
    app.exit(1);
  }
});
