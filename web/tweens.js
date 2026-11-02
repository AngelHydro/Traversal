// Time-based animations, free of Three.js: update(k) is called with k going 0 -> 1 over `ms`, then done().

/** @param {() => number} now clock in ms (performance.now in the page) */
export function createTweens(now) {
  let tweens = [];
  let pass = [];   // the tweens of the run() in progress: cancel()/clear() must reach them too
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
    cancel(t) { if (t) { t.dead = true; tweens = tweens.filter((x) => x !== t); } },
    clear() { for (const x of [...tweens, ...pass]) x.dead = true; tweens = []; },
    setEnabled(on) { enabled = on; },
    /** Advances every tween to time `t` (call once per frame). */
    run(t) {
      // Tweens started from an update or a done() (chained animations) go to a fresh list and are kept.
      pass = tweens;
      tweens = [];
      const kept = pass.filter((x) => {
        if (x.dead) return false;               // cancelled, possibly earlier in this very pass
        if (t < x.start) return true;
        const k = Math.min(1, (t - x.start) / x.ms);
        x.update(k);
        if (k < 1) return true;
        x.done();
        return false;
      }).filter((x) => !x.dead);               // cancelled after its own turn in this pass
      pass = [];
      tweens = kept.concat(tweens);
    },
  };
}
