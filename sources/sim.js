// Simulated pulse/breathing so the whole flow can be built and tested without the SDK or credits.
// Move the slider in the UI: 0 = resting, 1 = very worked up.
const EventEmitter = require('events');
module.exports = function createSimSource() {
  const em = new EventEmitter();
  let arousal = 0, timer = null;
  const jitter = (n) => (Math.random() - 0.5) * n;
  em.setArousal = (v) => { arousal = Math.max(0, Math.min(1, Number(v) || 0)); };
  em.start = async () => {
    em.emit('status', { kind: 'quality', ok: true, message: 'Simulator signal is ready.' });
    timer = setInterval(() => em.emit('sample', {
      t: Date.now(),
      pulse: 70 + arousal * 35 + jitter(1.5),
      breath: 14 + arousal * 14 + jitter(0.6),
    }), 1000);
  };
  em.stop = async () => { clearInterval(timer); timer = null; };
  return em;
};
