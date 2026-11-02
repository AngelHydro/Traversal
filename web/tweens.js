// Time-based animations, free of Three.js: update(k) is called with k going 0 -> 1 over `ms`, then done().

/** @param {() => number} now clock in ms (performance.now in the page) */
export function createTweens(now) {
  let tweens = [];
  let enabled = true;
  return {
    /** Starts a tween; returns a handle for cancel(), or null when animations are off (it ends at once). */
    tween(ms, update, done = () => {}, delay = 0) {
      if (!enabled) { update(1); done(); return null; }
      const t = { start: now() + delay, ms, update, done };
      tweens.push(t);
      return t;
    },
    /** Stops a tween where it is; its done() is not called. */
    cancel(t) { if (t) tweens = tweens.filter((x) => x !== t); },
    clear() { tweens = []; },
    setEnabled(on) { enabled = on; },
    /** Advances every tween to time `t` (call once per frame). */
    run(t) {
      // Tweens started from an update or a done() (chained animations) go to a fresh list and are kept.
      const current = tweens;
      tweens = [];
      const kept = current.filter((x) => {
        if (t < x.start) return true;
        const k = Math.min(1, (t - x.start) / x.ms);
        x.update(k);
        if (k < 1) return true;
        x.done();
        return false;
      });
      tweens = kept.concat(tweens);
    },
  };
}
