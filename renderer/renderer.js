const $ = (id) => document.getElementById(id);
const q = (selector) => document.querySelector(selector);
const engine = new DolowcoolLock.LockEngine();

let active = false;
let sourceName = 'sim';
let qualityOk = false;
let timedOut = false;
let lastSampleAt = 0;
let currentSample = null;
let currentSnapshot = null;
let cancelDemoScenario = null;

const numberText = (value, digits = 0) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
const percentAbove = (value, baseline) => Number.isFinite(value) && Number.isFinite(baseline)
  ? Math.round((value - baseline) / baseline * 100) : null;

function setQuality(kind, text) {
  const pill = $('qualityPill');
  pill.className = `quality ${kind}`;
  pill.innerHTML = `<span class="dot"></span>${text}`;
}

function composerHasMessage() { return Boolean($('msg').value.trim()); }

function updateActionAvailability() {
  const unlocked = active && qualityOk && !timedOut && currentSnapshot?.state === 'unlocked';
  const hasMessage = composerHasMessage();
  $('send').disabled = !(unlocked && hasMessage);
  $('copy').disabled = !(unlocked && hasMessage);
  $('override').classList.toggle('hidden', !(active && currentSnapshot?.state === 'locked' && hasMessage));
  if (currentSnapshot?.state !== 'locked') $('overrideConfirm').classList.add('hidden');
}

function metricMeta(value, baseline, unit) {
  if (!Number.isFinite(value)) return 'Waiting for a reading';
  if (!Number.isFinite(baseline)) return 'Included in your live baseline';
  const delta = percentAbove(value, baseline);
  const sign = delta > 0 ? '+' : '';
  return `baseline ${numberText(baseline, unit === 'br/min' ? 1 : 0)} · ${sign}${delta}% now`;
}

function renderMetrics(sample, snapshot) {
  $('pulseNow').textContent = numberText(sample?.pulse);
  $('breathNow').textContent = numberText(sample?.breath, 1);
  $('pulseMeta').textContent = metricMeta(sample?.pulse, snapshot?.base?.pulse, 'bpm');
  $('breathMeta').textContent = metricMeta(sample?.breath, snapshot?.base?.breath, 'br/min');
}

function lockExplanation(snapshot) {
  if (!snapshot.base || !currentSample) return 'Comparing readings with your personal baseline.';
  const driver = snapshot.breakdown.driver;
  if (!driver) return 'Both readings are close to your baseline.';
  const value = driver === 'pulse' ? currentSample.pulse : currentSample.breath;
  const base = snapshot.base[driver];
  const delta = percentAbove(value, base);
  const label = driver === 'pulse' ? 'Pulse' : 'Breathing rate';
  return `${label} is ${Math.max(0, delta)}% above your baseline and is driving the pause.`;
}

function renderSnapshot(snapshot) {
  currentSnapshot = snapshot;
  $('score').textContent = numberText(snapshot.score, 1);
  $('fill').className = snapshot.state === 'locked' ? 'fill hot' : 'fill';
  $('fill').style.width = `${Math.min(snapshot.score / 2, 1) * 100}%`;
  q('.gauge')?.setAttribute('aria-valuenow', String(Math.min(2, snapshot.score)));

  const banner = $('lockBanner');
  banner.className = `lock-banner ${snapshot.state}`;

  if (snapshot.state === 'calibrating') {
    $('status').textContent = 'Learning your calm baseline';
    $('explanation').textContent = snapshot.calibrationReason;
    $('progressLabel').textContent = 'Continuous baseline';
    $('progressValue').textContent = snapshot.calibrationLeft ? `${snapshot.calibrationLeft}s` : 'checking stability';
    $('progressFill').style.width = `${snapshot.calibrationProgress * 100}%`;
    $('lockTitle').textContent = 'Learning your baseline';
    $('lockText').textContent = 'Live readings are visible, but actions stay paused until the baseline is stable.';
    $('sendLabel').textContent = 'Open in email when settled';
    $('sendIcon').textContent = '⌁';
  } else if (snapshot.state === 'unlocked') {
    $('status').textContent = 'Settled. Your choice is open.';
    $('explanation').textContent = lockExplanation(snapshot);
    $('progressLabel').textContent = 'Signal confidence';
    $('progressValue').textContent = 'ready';
    $('progressFill').style.width = '100%';
    $('lockTitle').textContent = 'The pause is complete';
    $('lockText').textContent = 'Open the message in your email app or copy it. Nothing sends automatically.';
    $('sendLabel').textContent = 'Open in email';
    $('sendIcon').textContent = '→';
  } else {
    $('status').textContent = snapshot.calmLeft !== null ? `Settling… ${snapshot.calmLeft}s` : 'Pause active';
    $('explanation').textContent = snapshot.signalGap
      ? 'The signal was interrupted. A fresh continuous calm hold is required.'
      : lockExplanation(snapshot);
    $('progressLabel').textContent = snapshot.calmLeft !== null ? 'Continuous calm hold' : 'Waiting to settle';
    $('progressValue').textContent = snapshot.calmLeft !== null ? `${snapshot.calmLeft}s` : '—';
    $('progressFill').style.width = `${snapshot.calmProgress * 100}%`;
    $('lockTitle').textContent = 'A deliberate pause is active';
    $('lockText').textContent = snapshot.calmLeft !== null
      ? 'Stay steady until the timer completes.' : 'Save the draft now, or wait for your readings to settle.';
    $('sendLabel').textContent = 'Paused until settled';
    $('sendIcon').textContent = '⌁';
  }
  updateActionAvailability();
}

function showSignalProblem(message) {
  timedOut = true;
  setQuality('bad', 'Signal paused');
  $('status').textContent = 'Signal needs attention';
  $('explanation').textContent = message;
  $('cameraHint').textContent = message;
  updateActionAvailability();
}

function handleStatus(event) {
  if (event.kind === 'lifecycle') {
    document.body.dataset.sdkProcessingStatus = String(event.status);
  }
  if (event.kind === 'stream') {
    document.body.dataset.sdkStreamAvailable = String(Boolean(event.available));
    return;
  }
  if (event.kind === 'metrics') {
    document.body.dataset.sdkMetricsPacketCount = String(
      Number(document.body.dataset.sdkMetricsPacketCount || 0) + 1,
    );
    if (event.pulsePresent) document.body.dataset.sdkMetricsPulsePresent = 'true';
    if (event.breathPresent) document.body.dataset.sdkMetricsBreathPresent = 'true';
    return;
  }
  if (event.kind === 'quality') {
    document.body.dataset.sdkValidationCode = String(event.code);
    document.body.dataset.sdkValidationMessage = String(event.message || '');
    document.body.dataset.sdkValidationCount = String(
      Number(document.body.dataset.sdkValidationCount || 0) + 1,
    );
    qualityOk = Boolean(event.ok);
    timedOut = true;
    if (qualityOk) {
      setQuality('good', 'Signal clear');
      $('cameraHint').textContent = 'Signal is clear. Keep comfortably still.';
    } else {
      setQuality(event.code === 10 ? 'tuning' : 'bad', event.code === 10 ? 'Tuning' : 'Adjust camera');
      $('cameraHint').textContent = event.message;
      $('status').textContent = 'Help the camera get a clear signal';
      $('explanation').textContent = event.message;
      if (engine.state === 'calibrating') engine.reset();
    }
    updateActionAvailability();
  } else if (!qualityOk && event.message) {
    $('status').textContent = event.message;
  }
}

function handleSample(sample) {
  if (Number.isFinite(sample?.pulse)) document.body.dataset.sdkPulseReceived = 'true';
  if (Number.isFinite(sample?.breath)) document.body.dataset.sdkBreathReceived = 'true';
  lastSampleAt = Date.now();
  timedOut = false;
  currentSample = sample;
  renderMetrics(sample, currentSnapshot);
  if (!qualityOk) return;
  const snapshot = engine.push(sample);
  renderMetrics(sample, snapshot);
  renderSnapshot(snapshot);
}

function handleError(raw, details = {}) {
  const message = typeof raw === 'object' && raw ? raw.message : raw;
  const metadata = typeof raw === 'object' && raw ? raw : details;
  document.body.dataset.sdkErrorCode = String(metadata.code ?? 'unknown');
  document.body.dataset.sdkErrorMessage = String(message || 'Unknown SmartSpectra error.');
  document.body.dataset.sdkErrorRetryable = String(Boolean(metadata.retryable));
  qualityOk = false;
  showSignalProblem(`SmartSpectra: ${message}`);
}

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
const writeYuvPixel = (out, offset, y, u, v) => {
  const c = y - 16;
  const d = u - 128;
  const e = v - 128;
  out[offset] = clampByte((298 * c + 409 * e + 128) / 256);
  out[offset + 1] = clampByte((298 * c - 100 * d - 208 * e + 128) / 256);
  out[offset + 2] = clampByte((298 * c + 516 * d + 128) / 256);
  out[offset + 3] = 255;
};

function frameToRgba(frame) {
  const width = Number(frame.width);
  const height = Number(frame.height);
  const stride = Number(frame.stride);
  const format = Number(frame.pixelFormat);
  const bytes = frame.buffer instanceof Uint8Array
    ? frame.buffer
    : new Uint8Array(frame.buffer?.data || frame.buffer || 0);
  if (!width || !height || !stride || !bytes.length) throw new Error('Camera preview frame is malformed.');

  const out = new Uint8ClampedArray(width * height * 4);
  if (format <= 3) {
    const channels = format < 2 ? 3 : 4;
    const bgr = format === 1 || format === 3;
    for (let y = 0; y < height; y += 1) {
      let src = y * stride;
      let dst = y * width * 4;
      for (let x = 0; x < width; x += 1, src += channels, dst += 4) {
        out[dst] = bytes[src + (bgr ? 2 : 0)];
        out[dst + 1] = bytes[src + 1];
        out[dst + 2] = bytes[src + (bgr ? 0 : 2)];
        out[dst + 3] = channels === 4 ? bytes[src + 3] : 255;
      }
    }
    return { width, height, pixels: out };
  }
  if (format === 6) {
    for (let y = 0; y < height; y += 1) {
      const row = y * stride;
      for (let x = 0; x < width; x += 2) {
        const src = row + x * 2;
        const dst = (y * width + x) * 4;
        writeYuvPixel(out, dst, bytes[src], bytes[src + 1], bytes[src + 3]);
        if (x + 1 < width) writeYuvPixel(out, dst + 4, bytes[src + 2], bytes[src + 1], bytes[src + 3]);
      }
    }
    return { width, height, pixels: out };
  }
  if (format === 4 || format === 5) {
    const uvBase = stride * height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const uv = uvBase + Math.floor(y / 2) * stride + Math.floor(x / 2) * 2;
        const u = bytes[uv + (format === 4 ? 0 : 1)];
        const v = bytes[uv + (format === 4 ? 1 : 0)];
        writeYuvPixel(out, (y * width + x) * 4, bytes[y * stride + x], u, v);
      }
    }
    return { width, height, pixels: out };
  }
  throw new Error(`Unsupported camera preview pixel format ${format}.`);
}

function drawCameraFrame(frame) {
  const canvas = $('preview');
  try {
    const image = frameToRgba(frame);
    if (canvas.width !== image.width || canvas.height !== image.height) {
      canvas.width = image.width;
      canvas.height = image.height;
    }
    canvas.getContext('2d', { alpha: false }).putImageData(
      new ImageData(image.pixels, image.width, image.height),
      0,
      0,
    );
  } catch (error) {
    document.body.dataset.previewError = String(error.message || error);
    return;
  }
  document.body.dataset.sdkStreamAvailable = 'true';
  document.body.dataset.previewFrameReceived = 'true';
}

function resetVisualState() {
  delete document.body.dataset.sdkErrorCode;
  delete document.body.dataset.sdkErrorMessage;
  delete document.body.dataset.sdkErrorRetryable;
  delete document.body.dataset.sdkProcessingStatus;
  delete document.body.dataset.sdkStreamAvailable;
  delete document.body.dataset.sdkPulseReceived;
  delete document.body.dataset.sdkBreathReceived;
  delete document.body.dataset.sdkValidationCode;
  delete document.body.dataset.sdkValidationMessage;
  delete document.body.dataset.sdkValidationCount;
  delete document.body.dataset.sdkMetricsPacketCount;
  delete document.body.dataset.sdkMetricsPulsePresent;
  delete document.body.dataset.sdkMetricsBreathPresent;
  delete document.body.dataset.previewFrameReceived;
  delete document.body.dataset.previewError;
  qualityOk = false; timedOut = false; lastSampleAt = 0; currentSample = null; currentSnapshot = null;
  engine.reset();
  $('pulseNow').textContent = '—'; $('breathNow').textContent = '—';
  $('pulseMeta').textContent = 'Waiting for a reading'; $('breathMeta').textContent = 'Waiting for a reading';
  $('score').textContent = '0.0'; $('fill').style.width = '0%'; $('progressFill').style.width = '0%';
  $('overrideConfirm').classList.add('hidden');
  setQuality('waiting', 'Waiting');
  const preview = $('preview');
  preview.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
  renderSnapshot(engine.snapshot(Date.now()));
}

$('agree').onchange = () => { $('start').disabled = !$('agree').checked; };

$('start').onclick = async () => {
  $('startErr').textContent = '';
  $('start').disabled = true;
  resetVisualState();
  try {
    const config = await window.dolowcool.config();
    sourceName = config.source;
    active = true;
    $('sourcePill').textContent = sourceName === 'sim' ? 'Simulator · Simulated' : 'Live SmartSpectra';
    $('privacyPill').innerHTML = `<span class="dot"></span>${config.telemetry ? 'Telemetry on' : 'Telemetry off'}`;
    $('privacyPill').className = config.telemetry ? 'pill' : 'pill safe';
    $('telemetryNote').textContent = config.telemetry ? 'SDK telemetry is on for this session.' : 'SDK telemetry is off.';
    $('consent').classList.add('hidden');
    $('app').classList.remove('hidden');

    if (sourceName === 'sim') {
      $('simBox').classList.remove('hidden');
      $('simVisual').classList.remove('hidden');
      q('.face-guide')?.classList.add('hidden');
      $('cameraHint').textContent = 'Use the slider after calibration to demonstrate the lock.';
      await window.dolowcool.start();
    } else {
      $('simBox').classList.add('hidden');
      $('simVisual').classList.add('hidden');
      q('.face-guide')?.classList.remove('hidden');
      await window.dolowcool.start();
    }
  } catch (error) {
    document.body.dataset.sdkErrorCode = String(error?.code ?? 'start-rejected');
    document.body.dataset.sdkErrorMessage = String(error?.message || error);
    document.body.dataset.sdkErrorRetryable = String(Boolean(error?.retryable));
    active = false;
    try { await window.dolowcool.stop(); } catch {}
    $('app').classList.add('hidden');
    $('consent').classList.remove('hidden');
    $('startErr').textContent = String(error.message || error).replace(/^Error invoking remote method.*?Error: /, '');
    $('start').disabled = false;
  }
};

$('stop').onclick = async () => {
  active = false;
  cancelDemoScenario?.();
  cancelDemoScenario = null;
  $('runDemo').disabled = false;
  $('runDemo').textContent = 'Run demo scenario · about 60 seconds';
  $('demoStage').textContent = 'Simulated controls only. No camera or SmartSpectra API key is used.';
  try {
    await window.dolowcool.stop();
  } finally {
    $('app').classList.add('hidden');
    $('consent').classList.remove('hidden');
    $('simBox').classList.add('hidden');
    $('simVisual').classList.add('hidden');
    $('agree').checked = false;
    $('start').disabled = true;
    resetVisualState();
  }
};

$('recalibrate').onclick = () => {
  engine.reset();
  currentSnapshot = engine.snapshot(Date.now());
  renderSnapshot(currentSnapshot);
  $('toast').textContent = 'Fresh baseline started. Sit comfortably and breathe normally.';
};

$('sim').oninput = (event) => window.dolowcool.simSet(Number(event.target.value));
$('runDemo').onclick = () => {
  cancelDemoScenario?.();
  $('runDemo').disabled = true;
  $('runDemo').textContent = 'Demo scenario running…';
  cancelDemoScenario = DolowcoolDemo.run({
    setLevel(level) {
      $('sim').value = String(level);
      window.dolowcool.simSet(level);
    },
    onStep(step) { $('demoStage').textContent = `Simulated · ${step.label}`; },
    onDone() {
      $('runDemo').disabled = false;
      $('runDemo').textContent = 'Run demo scenario · about 60 seconds';
      cancelDemoScenario = null;
    },
  });
};
window.dolowcool.onSample(handleSample);
window.dolowcool.onStatus(handleStatus);
window.dolowcool.onError(handleError);
window.dolowcool.onFrame(drawCameraFrame);

function draftPayload() {
  return { to: $('recipient').value.trim(), subject: $('subject').value.trim(), body: $('msg').value };
}

function markUnsaved() {
  $('charCount').textContent = `${$('msg').value.length} / 8000`;
  $('draftState').textContent = 'Unsaved changes';
  updateActionAvailability();
}

['recipient', 'subject', 'msg'].forEach((id) => $(id).addEventListener('input', markUnsaved));

$('draft').onclick = () => {
  try { localStorage.setItem('dolowcool-draft', JSON.stringify({ ...draftPayload(), savedAt: Date.now() })); } catch {}
  $('draftState').textContent = 'Saved locally';
  $('toast').textContent = 'Draft saved on this device. Come back when the words feel different.';
};

$('discard').onclick = () => {
  try { localStorage.removeItem('dolowcool-draft'); } catch {}
  $('recipient').value = '';
  $('subject').value = '';
  $('msg').value = '';
  $('charCount').textContent = '0 / 8000';
  $('draftState').textContent = 'No local draft';
  $('toast').textContent = 'Local draft deleted.';
  updateActionAvailability();
};

$('copy').onclick = () => {
  window.dolowcool.copyText($('msg').value);
  $('toast').textContent = 'Message copied. You still choose where it goes.';
};

async function openEmail(isOverride = false) {
  try {
    await window.dolowcool.openEmail(draftPayload());
    $('toast').textContent = isOverride
      ? 'Override used. Your email app is open; nothing was sent automatically.'
      : 'Opened in your email app. Review once more before sending.';
    $('overrideConfirm').classList.add('hidden');
  } catch (error) {
    $('toast').textContent = String(error.message || error).replace(/^Error invoking remote method.*?Error: /, '');
  }
}

$('send').onclick = () => openEmail(false);
$('override').onclick = () => $('overrideConfirm').classList.remove('hidden');
$('overrideNo').onclick = () => $('overrideConfirm').classList.add('hidden');
$('overrideYes').onclick = () => openEmail(true);

try {
  const saved = JSON.parse(localStorage.getItem('dolowcool-draft') || 'null');
  if (saved) {
    $('recipient').value = saved.to || '';
    $('subject').value = saved.subject || '';
    $('msg').value = saved.body || '';
    $('draftState').textContent = 'Restored local draft';
  }
} catch {}
$('charCount').textContent = `${$('msg').value.length} / 8000`;

setInterval(() => {
  if (active && qualityOk && lastSampleAt && Date.now() - lastSampleAt > 6000 && !timedOut) {
    showSignalProblem('Readings paused. Actions stay locked until a continuous signal returns.');
  }
}, 1000);

resetVisualState();
