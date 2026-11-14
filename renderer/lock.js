// Pure lock logic. It runs in the renderer and in Node tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DolowcoolLock = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DEFAULTS = {
    baselineSeconds: 20,
    minBaselineSamples: 12,
    pulseMadLimit: 0.06,
    breathMadLimit: 0.12,
    pulseRise: 0.15,
    breathRise: 0.30,
    lockAt: 1.0,
    unlockAt: 0.5,
    holdSeconds: 8,
    smoothing: 0.3,
    maxSampleGapMs: 2500,
  };

  const finitePositive = (value) => Number.isFinite(value) && value > 0 ? value : null;
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = sorted.length >> 1;
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const relativeMad = (values, center) => median(values.map((value) => Math.abs(value - center))) / center;

  class LockEngine {
    constructor(options = {}) { this.cfg = { ...DEFAULTS, ...options }; this.reset(); }

    reset() {
      this.state = 'calibrating';
      this.samples = [];
      this.base = null;
      this.ema = null;
      this.calmSince = null;
      this.startT = null;
      this.lastT = null;
      this.score = 0;
      this.calibrationReason = 'Sit comfortably and breathe normally.';
      this.lastBreakdown = { pulse: 0, breath: 0, driver: null };
    }

    push(input) {
      const c = this.cfg;
      const t = Number.isFinite(input?.t) ? input.t : Date.now();
      const sample = {
        t,
        pulse: finitePositive(Number(input?.pulse)),
        breath: finitePositive(Number(input?.breath)),
      };
      const gap = this.lastT === null ? 0 : t - this.lastT;
      const interrupted = this.lastT !== null && (gap <= 0 || gap > c.maxSampleGapMs);

      if (this.state === 'calibrating') {
        if (this.startT === null || interrupted) {
          this.samples = [];
          this.startT = t;
          this.calibrationReason = interrupted
            ? 'Signal interrupted. Building a fresh continuous baseline…'
            : 'Sit comfortably and breathe normally.';
        }
        this.samples.push(sample);
        const cutoff = t - c.baselineSeconds * 1000;
        this.samples = this.samples.filter((item) => item.t >= cutoff);

        const pulses = this.samples.map((item) => item.pulse).filter((value) => value !== null);
        const breaths = this.samples.map((item) => item.breath).filter((value) => value !== null);
        const elapsed = Math.max(0, (t - this.startT) / 1000);

        if (elapsed >= c.baselineSeconds && pulses.length >= c.minBaselineSamples && breaths.length >= c.minBaselineSamples) {
          const pulse = median(pulses);
          const breath = median(breaths);
          const pulseMad = relativeMad(pulses, pulse);
          const breathMad = relativeMad(breaths, breath);
          if (pulseMad <= c.pulseMadLimit && breathMad <= c.breathMadLimit) {
            this.base = { pulse, breath, pulseMad, breathMad };
            this.state = 'unlocked';
            this.calibrationReason = '';
          } else {
            this.calibrationReason = 'Readings are moving around. Hold still and breathe naturally.';
          }
        }
        this.lastT = t;
        return this.snapshot(t, interrupted);
      }

      if (interrupted) {
        this.state = 'locked';
        this.calmSince = null;
        this.ema = null;
      }

      const pulseScore = sample.pulse === null ? 0
        : Math.max(0, (sample.pulse - this.base.pulse) / this.base.pulse / c.pulseRise);
      const breathScore = sample.breath === null ? 0
        : Math.max(0, (sample.breath - this.base.breath) / this.base.breath / c.breathRise);
      const raw = Math.max(pulseScore, breathScore);
      this.ema = this.ema === null ? raw : c.smoothing * raw + (1 - c.smoothing) * this.ema;
      this.score = this.ema;
      this.lastBreakdown = {
        pulse: pulseScore,
        breath: breathScore,
        driver: pulseScore === 0 && breathScore === 0 ? null : pulseScore >= breathScore ? 'pulse' : 'breath',
      };

      if (this.state === 'unlocked' && this.score >= c.lockAt) {
        this.state = 'locked';
        this.calmSince = null;
      } else if (this.state === 'locked') {
        if (this.score <= c.unlockAt) {
          if (this.calmSince === null) this.calmSince = t;
          if ((t - this.calmSince) / 1000 >= c.holdSeconds) {
            this.state = 'unlocked';
            this.calmSince = null;
          }
        } else {
          this.calmSince = null;
        }
      }

      this.lastT = t;
      return this.snapshot(t, interrupted);
    }

    snapshot(now, signalGap = false) {
      const c = this.cfg;
      const calibrationElapsed = this.startT === null ? 0 : Math.max(0, (now - this.startT) / 1000);
      const calibrationLeft = Math.max(0, Math.ceil(c.baselineSeconds - calibrationElapsed));
      const calmElapsed = this.calmSince === null ? 0 : Math.max(0, (now - this.calmSince) / 1000);
      return {
        state: this.state,
        score: this.score,
        base: this.base,
        calibrationLeft,
        calibrationProgress: Math.min(1, calibrationElapsed / c.baselineSeconds),
        calibrationReason: this.calibrationReason,
        calmLeft: this.state === 'locked' && this.calmSince !== null
          ? Math.max(0, Math.ceil(c.holdSeconds - calmElapsed)) : null,
        calmProgress: this.state === 'locked' && this.calmSince !== null
          ? Math.min(1, calmElapsed / c.holdSeconds) : 0,
        breakdown: { ...this.lastBreakdown },
        signalGap,
      };
    }
  }

  return { LockEngine, DEFAULTS };
});
