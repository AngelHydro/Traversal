// Traversal — pendule (cadence « minutes + incrément », comme aux échecs).
(function (root) {
  'use strict';

  // minutes: null = sans limite.
  const PRESETS = [
    { group: 'Sans limite', minutes: null, increment: 0 },
    { group: 'Bullet', minutes: 1, increment: 0 },
    { group: 'Bullet', minutes: 1, increment: 1 },
    { group: 'Bullet', minutes: 2, increment: 1 },
    { group: 'Blitz', minutes: 3, increment: 0 },
    { group: 'Blitz', minutes: 3, increment: 2 },
    { group: 'Blitz', minutes: 5, increment: 0 },
    { group: 'Blitz', minutes: 5, increment: 3 },
    { group: 'Rapide', minutes: 10, increment: 0 },
    { group: 'Rapide', minutes: 10, increment: 5 },
    { group: 'Rapide', minutes: 15, increment: 10 },
    { group: 'Classique', minutes: 30, increment: 0 },
    { group: 'Classique', minutes: 30, increment: 20 },
  ];

  const LIMITS = { minMinutes: 0.5, maxMinutes: 180, maxIncrement: 180 };

  const label = (tc) => (tc.minutes === null ? 'Sans limite' : tc.minutes + ' | ' + tc.increment);

  // Valide une cadence personnalisée ; renvoie null si elle est hors limites.
  function customControl(minutes, increment) {
    const m = Number(minutes);
    const i = Number(increment);
    if (!Number.isFinite(m) || m < LIMITS.minMinutes || m > LIMITS.maxMinutes) return null;
    if (!Number.isInteger(i) || i < 0 || i > LIMITS.maxIncrement) return null;
    return { group: 'Personnalisée', minutes: m, increment: i };
  }

  // Le temps est calculé à partir de l'horloge système (pas de dérive liée à setInterval).
  function createClock(initialMs, incrementMs, now) {
    now = now || (() => performance.now());
    const time = [initialMs, initialMs];
    let active = null;
    let stamp = 0;
    let flagged = null;

    function sync() {
      if (active === null) return;
      const t = now();
      time[active] -= t - stamp;
      stamp = t;
      if (time[active] <= 0) {
        time[active] = 0;
        flagged = active;
        active = null;
      }
    }

    return {
      start(player) {
        sync();
        if (flagged !== null) return;
        active = player;
        stamp = now();
      },
      // Le joueur actif vient de jouer : il reçoit l'incrément, la pendule passe à l'adversaire.
      press() {
        sync();
        if (active === null) return;
        time[active] += incrementMs;
        active = 1 - active;
        stamp = now();
      },
      stop() {
        sync();
        active = null;
      },
      remaining(player) {
        sync();
        return time[player];
      },
      flagged() {
        sync();
        return flagged;
      },
      active: () => active,
    };
  }

  // 1:05:03, 4:59, puis 19.4 sous les 20 secondes.
  function formatTime(ms) {
    const total = Math.max(0, ms);
    if (total < 20000) return (Math.floor(total / 100) / 10).toFixed(1);
    const s = Math.floor(total / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : m + ':' + ss;
  }

  const api = { PRESETS, LIMITS, label, customControl, createClock, formatTime };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Clock = api;
})(this);
