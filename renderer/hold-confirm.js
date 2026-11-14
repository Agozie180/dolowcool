(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DolowcoolHold = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  class HoldGate {
    constructor(durationMs = 3000) {
      this.durationMs = durationMs;
      this.cancel();
    }

    start(at = 0) {
      this.startedAt = at;
      this.active = true;
      this.completed = false;
    }

    update(at) {
      if (!this.active) return this.completed ? 1 : 0;
      const progress = Math.max(0, Math.min(1, (at - this.startedAt) / this.durationMs));
      if (progress >= 1) {
        this.active = false;
        this.completed = true;
      }
      return progress;
    }

    cancel() {
      this.startedAt = null;
      this.active = false;
      this.completed = false;
    }
  }

  return { HoldGate };
});
