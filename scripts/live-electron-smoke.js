const assert = require('node:assert/strict');
const { app } = require('electron');
const main = require('../main');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const liveTimeoutMs = Number(process.env.DOLOWCOOL_LIVE_TIMEOUT_MS || 45000);
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
  quality: document.getElementById('qualityPill').textContent.trim(),
  status: document.getElementById('status').textContent.trim(),
}))()`);

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
      const validationReceived = Number(document.body.dataset.sdkValidationCount || 0) > 0;
      if (!expectMetrics && hasStream && validationReceived) {
        return { kind: 'transport', status, quality, hasStream, pulseReceived, breathReceived };
      }
      if (hasStream && pulseReceived && breathReceived) {
        return { kind: 'metrics', status, quality, hasStream, pulseReceived, breathReceived };
      }
      return null;
      })()`), 'Live SmartSpectra session did not produce both requested metrics.');
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
    await win.webContents.executeJavaScript(`document.getElementById('stop').click()`);
    await waitFor(async () => win.webContents.executeJavaScript(
      `!document.getElementById('consent').classList.contains('hidden')`
    ), 'Live session did not stop cleanly.');
    console.log(`RESULT=PASSED MODE=${expectMetrics ? 'metrics' : 'transport'} STREAM=${result.hasStream} PULSE_RECEIVED=${result.pulseReceived} BREATH_RECEIVED=${result.breathReceived} QUALITY=${result.quality}`);
    await wait(1000);
    app.quit();
  } catch (error) {
    if (win && !win.isDestroyed()) {
      try {
        await win.webContents.executeJavaScript(`document.getElementById('stop').click()`);
        await waitFor(async () => win.webContents.executeJavaScript(
          `!document.getElementById('consent').classList.contains('hidden')`
        ), 'Live session did not stop cleanly after failure.', 10000);
      } catch {}
    }
    console.error(`RESULT=FAILED REASON=${error.message}`);
    await wait(1000);
    app.exitCode = 1;
    app.quit();
  }
});
