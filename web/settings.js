// Visual settings, kept in the browser's storage. Pure: the storage object is passed in, so a blocked
// storage (private window, disabled cookies) only means the defaults are used.

/** Allowed values for each setting. */
export const OPTIONS = {
  heightMarks: ['notches', 'numbers'],   // how cell heights are shown
  showCosts: [true, false],              // movement cost on the yellow cells
  palette: ['soft', 'classic'],          // terrain colors: smooth gradient, or game.py's 7 colors
  theme: ['system', 'light', 'dark'],
  rotateCamera: [false, true],           // turn the board towards the player to move
  animations: [true, false],
};

/** Settings used when nothing valid is stored. */
export const DEFAULTS = {
  heightMarks: 'notches', showCosts: true, palette: 'soft', theme: 'system', rotateCamera: false, animations: true,
};

const KEY = 'traversal-settings';

/** Stored settings merged over the defaults; unknown keys and invalid values are dropped. */
export function loadSettings(storage) {
  let saved = {};
  try { saved = JSON.parse(storage.getItem(KEY)) || {}; } catch { /* unavailable or corrupt: defaults */ }
  const out = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) if (OPTIONS[k].includes(saved[k])) out[k] = saved[k];
  return out;
}

/** Stores the settings; silently does nothing when the storage is unavailable. */
export function saveSettings(storage, settings) {
  try { storage.setItem(KEY, JSON.stringify(settings)); } catch { /* the game works without saving */ }
}
