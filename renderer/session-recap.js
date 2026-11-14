(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DolowcoolRecap = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  class SessionRecap {
    constructor(maxPoints = 180) {
      this.maxPoints = maxPoints;
      this.clear();
    }

    reset(startAt = Date.now()) {
      this.startAt = startAt;
      this.points = [];
      this.markers = [];
      this.state = null;
      this.lockedAt = null;
      this.waitedMs = 0;
    }

    clear() {
      this.startAt = null;
      this.points = [];
      this.markers = [];
      this.state = null;
      this.lockedAt = null;
      this.waitedMs = 0;
    }

    record(snapshot, at = Date.now()) {
      if (this.startAt === null) this.reset(at);
      const elapsedMs = Math.max(0, at - this.startAt);
      this.points.push({ elapsedMs, score: Math.max(0, Number(snapshot?.score) || 0) });
      if (this.points.length > this.maxPoints) this.points.shift();

      const nextState = snapshot?.state || null;
      if (nextState === 'locked' && this.state !== 'locked') {
        this.lockedAt = at;
        this.markers.push({ elapsedMs, type: 'pause' });
      } else if (this.state === 'locked' && nextState === 'unlocked') {
        this.waitedMs += Math.max(0, at - this.lockedAt);
        this.lockedAt = null;
        this.markers.push({ elapsedMs, type: 'unlock' });
      }
      this.state = nextState;
    }

    end(at = Date.now()) {
      if (this.startAt === null) this.reset(at);
      if (this.state === 'locked' && this.lockedAt !== null) {
        this.waitedMs += Math.max(0, at - this.lockedAt);
        this.lockedAt = null;
      }
      return {
        durationMs: Math.max(0, at - this.startAt),
        waitedMs: this.waitedMs,
        points: this.points.map((point) => ({ ...point })),
        markers: this.markers.map((marker) => ({ ...marker })),
      };
    }
  }

  return { SessionRecap };
});
