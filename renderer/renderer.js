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
let presageClient = null;

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
  if (event.kind === 'quality') {
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
  lastSampleAt = Date.now();
  timedOut = false;
  currentSample = sample;
  renderMetrics(sample, currentSnapshot);
  if (!qualityOk) return;
  const snapshot = engine.push(sample);
  renderMetrics(sample, snapshot);
  renderSnapshot(snapshot);
}

function handleError(message) {
  qualityOk = false;
  showSignalProblem(`SmartSpectra: ${message}`);
}

function attachPreview(stream) {
  $('preview').srcObject = stream;
  $('preview').play().catch(() => {});
}

function resetVisualState() {
  qualityOk = false; timedOut = false; lastSampleAt = 0; currentSample = null; currentSnapshot = null;
  engine.reset();
  $('pulseNow').textContent = '—'; $('breathNow').textContent = '—';
  $('pulseMeta').textContent = 'Waiting for a reading'; $('breathMeta').textContent = 'Waiting for a reading';
  $('score').textContent = '0.0'; $('fill').style.width = '0%'; $('progressFill').style.width = '0%';
  $('overrideConfirm').classList.add('hidden');
  setQuality('waiting', 'Waiting');
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
    $('sourcePill').textContent = sourceName === 'sim' ? 'Simulator' : 'Live SmartSpectra';
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
      const options = await window.dolowcool.presageConfig();
      presageClient = window.DolowcoolPresage.createClient({
        onSample: handleSample,
        onStatus: handleStatus,
        onError: handleError,
        onStream: attachPreview,
      });
      await presageClient.start(options);
    }
  } catch (error) {
    active = false;
    try { await presageClient?.stop(); } catch {}
    presageClient = null;
    $('app').classList.add('hidden');
    $('consent').classList.remove('hidden');
    $('startErr').textContent = String(error.message || error).replace(/^Error invoking remote method.*?Error: /, '');
    $('start').disabled = false;
  }
};

$('stop').onclick = async () => {
  active = false;
  try {
    if (sourceName === 'presage') await presageClient?.stop();
    else await window.dolowcool.stop();
  } finally {
    presageClient = null;
    $('preview').srcObject = null;
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
window.dolowcool.onSample(handleSample);
window.dolowcool.onStatus(handleStatus);
window.dolowcool.onError(handleError);

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
