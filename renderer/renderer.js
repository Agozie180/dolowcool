const $ = (id) => document.getElementById(id);
const engine = new DolowcoolLock.LockEngine();
let active = false;
let qualityOk = false;
let lastSampleAt = 0;

const reading = (value, digits = 0) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';

function showSignalProblem(message) {
  $('status').textContent = message;
  $('status').className = 'status err';
  $('send').disabled = true;
}

$('agree').onchange = () => { $('start').disabled = !$('agree').checked; };

$('start').onclick = async () => {
  $('startErr').textContent = '';
  $('start').disabled = true;
  engine.reset(); qualityOk = false; lastSampleAt = 0;
  try {
    await window.dolowcool.start();
    active = true;
    $('consent').classList.add('hidden'); $('app').classList.remove('hidden');
    const cfg = await window.dolowcool.config();
    if (cfg.source === 'sim') $('simBox').classList.remove('hidden');
  } catch (e) {
    $('startErr').textContent = e.message.replace(/^Error invoking remote method.*?Error: /, '');
    $('start').disabled = false;
  }
};

$('stop').onclick = async () => {
  active = false; qualityOk = false; lastSampleAt = 0;
  await window.dolowcool.stop();
  $('app').classList.add('hidden'); $('consent').classList.remove('hidden'); $('simBox').classList.add('hidden');
  $('agree').checked = false; $('start').disabled = true;
};

$('recalibrate').onclick = () => {
  engine.reset();
  $('send').disabled = true;
  $('fill').style.width = '0%';
  $('detail').textContent = '';
  $('status').textContent = 'Recalibrating from fresh readings…';
};

$('sim').oninput = (e) => window.dolowcool.simSet(Number(e.target.value));

window.dolowcool.onError((m) => { qualityOk = false; showSignalProblem('Signal problem: ' + m); });

window.dolowcool.onStatus((event) => {
  if (!active && event.kind !== 'quality') return;
  if (event.kind === 'quality') {
    qualityOk = Boolean(event.ok);
    if (!qualityOk) {
      if (engine.state === 'calibrating') engine.reset();
      showSignalProblem(event.message);
    } else if (!lastSampleAt) {
      $('status').className = 'status';
      $('status').textContent = 'Signal is clear. Waiting for readings…';
    }
  } else if (!qualityOk && event.message) {
    $('status').className = 'status';
    $('status').textContent = event.message;
  }
});

window.dolowcool.onSample((s) => {
  lastSampleAt = Date.now();
  if (!qualityOk) return;
  const snap = engine.push(s);
  const fill = $('fill'), status = $('status'), send = $('send');
  status.className = 'status';
  if (snap.state === 'calibrating') {
    status.textContent = `Learning your calm baseline… ${snap.calibrationLeft}s (sit still, breathe normally)`;
    fill.style.width = '0%'; send.disabled = true; $('detail').textContent = '';
    return;
  }
  fill.style.width = Math.min(snap.score / 2, 1) * 100 + '%';
  fill.style.background = snap.state === 'locked' ? 'var(--hot)' : 'var(--ok)';
  send.disabled = snap.state !== 'unlocked';
  status.textContent = snap.state === 'unlocked' ? 'Settled. Send is unlocked.'
    : snap.calmLeft !== null ? `Almost there… hold steady ${snap.calmLeft}s` : 'Still worked up. Send is locked. Slow breaths.';
  $('detail').textContent = `now ${reading(s.pulse)} bpm · ${reading(s.breath, 1)} br/min  |  your baseline ${reading(snap.base.pulse)} bpm · ${reading(snap.base.breath, 1)} br/min`;
});

setInterval(() => {
  if (active && qualityOk && lastSampleAt && Date.now() - lastSampleAt > 6000) {
    showSignalProblem('Readings paused. Send stays locked until the signal returns.');
  }
}, 1000);

$('send').onclick = () => { $('msg').value = ''; $('toast').textContent = 'Sent (demo: nothing leaves this app).'; };
$('draft').onclick = () => { try { localStorage.setItem('dolowcool-draft', $('msg').value); } catch {} $('msg').value = ''; $('toast').textContent = 'Draft saved. Look at it again tomorrow.'; };

try { $('msg').value = localStorage.getItem('dolowcool-draft') || ''; } catch {}
