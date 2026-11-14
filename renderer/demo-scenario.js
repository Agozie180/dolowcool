(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DolowcoolDemo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STEPS = Object.freeze([
    { at: 0, level: 0, label: 'Learning a settled baseline' },
    { at: 22000, level: 0.95, label: 'Simulating a rise' },
    { at: 35000, level: 0.95, label: 'Pause active' },
    { at: 38000, level: 0, label: 'Simulating settled readings' },
    { at: 59000, level: 0, label: 'Scenario complete' },
  ]);

  function run(options) {
    const schedule = options?.schedule || ((fn, delay) => setTimeout(fn, delay));
    const cancelSchedule = options?.cancelSchedule || clearTimeout;
    const timers = [];
    let cancelled = false;
    STEPS.forEach((step, index) => {
      timers.push(schedule(() => {
        if (cancelled) return;
        options.setLevel(step.level);
        options.onStep?.(step, index);
        if (index === STEPS.length - 1) options.onDone?.();
      }, step.at));
    });
    return () => {
      cancelled = true;
      timers.forEach(cancelSchedule);
    };
  }

  return { STEPS, run };
});
