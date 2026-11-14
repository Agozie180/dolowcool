// Pure lock logic. No Electron, no SDK. Works in the renderer (global DolowcoolLock) and in Node (tests).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DolowcoolLock = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DEFAULTS = {
    baselineSeconds: 30, // learn the person's own resting numbers first
    pulseRise: 0.15,     // +15% over baseline pulse counts as "1.0" on the gauge
    breathRise: 0.30,    // +30% over baseline breathing rate counts as "1.0"
    lockAt: 1.0,         // lock when smoothed score reaches this
    unlockAt: 0.5,       // must fall to this to start the calm timer (hysteresis)
    holdSeconds: 10,     // ...and stay there this long before unlocking
    smoothing: 0.3,      // EMA weight of the newest sample
  };
  const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  class LockEngine {
    constructor(opts = {}) { this.cfg = { ...DEFAULTS, ...opts }; this.reset(); }
    reset() { this.state = 'calibrating'; this.pulses = []; this.breaths = []; this.base = null; this.ema = null; this.calmSince = null; this.startT = null; this.score = 0; }
    push(s) {
      const c = this.cfg;
      if (this.startT === null) this.startT = s.t;
      if (this.state === 'calibrating') {
        if (s.pulse != null) this.pulses.push(s.pulse);
        if (s.breath != null) this.breaths.push(s.breath);
        const elapsed = (s.t - this.startT) / 1000;
        if (elapsed >= c.baselineSeconds && this.pulses.length >= 5 && this.breaths.length >= 5) {
          this.base = { pulse: median(this.pulses), breath: median(this.breaths) };
          this.state = 'unlocked';
        }
        return this.snapshot(elapsed, s.t);
      }
      const rises = [0];
      if (s.pulse != null) rises.push((s.pulse - this.base.pulse) / this.base.pulse / c.pulseRise);
      if (s.breath != null) rises.push((s.breath - this.base.breath) / this.base.breath / c.breathRise);
      const raw = Math.max(...rises);
      this.ema = this.ema === null ? raw : c.smoothing * raw + (1 - c.smoothing) * this.ema;
      this.score = this.ema;
      if (this.state === 'unlocked' && this.score >= c.lockAt) { this.state = 'locked'; this.calmSince = null; }
      else if (this.state === 'locked') {
        if (this.score <= c.unlockAt) {
          if (this.calmSince === null) this.calmSince = s.t;
          if ((s.t - this.calmSince) / 1000 >= c.holdSeconds) { this.state = 'unlocked'; this.calmSince = null; }
        } else this.calmSince = null;
      }
      return this.snapshot((s.t - this.startT) / 1000, s.t);
    }
    snapshot(elapsed, now) {
      const c = this.cfg;
      return {
        state: this.state, score: this.score, base: this.base,
        calibrationLeft: Math.max(0, Math.ceil(c.baselineSeconds - elapsed)),
        calmLeft: this.state === 'locked' && this.calmSince !== null ? Math.max(0, Math.ceil(c.holdSeconds - (now - this.calmSince) / 1000)) : null,
      };
    }
  }
  return { LockEngine, DEFAULTS };
});
