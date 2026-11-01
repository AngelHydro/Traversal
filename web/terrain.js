// Terrain generation, built on game.py's generator (gen_board, gen_mix_board, check_board).
// Board is SIZE x SIZE with a fixed border at height 0; playable cells are 1..10.

export const SIZE = 12;

/**
 * Terrain modes from the rules. Each is a recipe for the game.py generator; 'random' picks one of the others.
 * scramble: +1/-1 pushes biased by `factor` (low = mostly up), `push` per ring pass; mix: half rises, half sinks;
 * peaks: a flat plain with a few hills.
 */
export const MODES = [
  { id: 'random', name: 'Aléatoire', hint: 'Variété équilibrée de terrains' },
  { id: 'mountains', name: 'Montagnes', hint: 'Pics centraux spectaculaires', kind: 'scramble', factor: 0.225, push: 150 },
  { id: 'valleys', name: 'Vallées', hint: 'Cuvettes profondes bordées de crêtes', kind: 'scramble', factor: 0.775, push: 150 },
  { id: 'highlands', name: 'Hautes terres', hint: 'Montagnes et vallées réunies', kind: 'mix' },
  { id: 'woods', name: 'Bois', hint: 'Plutôt plat, collines douces', kind: 'scramble', factor: 0.5, push: 25 },
  { id: 'desert', name: 'Désert', hint: 'Étendues plates, rares pics', kind: 'peaks', peaks: 3 },
];

/** Mode selected when the page opens. */
export const DEFAULT_MODE = 'random';

/**
 * Seeded uniform [0, 1) generator (mulberry32): the same seed always gives the same board.
 * @param {number} seed
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// color_stick from game.py, indexed by height + 10, three heights per color.
const COLORS = [0x000080, 0x1e90ff, 0x8b4513, 0x008000, 0x808080, 0xffffff, 0x87ceeb];

const grid = (v = 0) => Array.from({ length: SIZE }, () => Array(SIZE).fill(v));
const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo)); // np.random.randint: hi excluded

/**
 * Height limits per cell: ring k (1..5) from the border can go from -2k to +2k.
 * @returns {{min: number[][], max: number[][]}} fresh 12x12 grids
 */
export function boardBounds() {
  const min = grid(), max = grid();
  for (let k = 1; k <= 5; k++)
    for (let i = k; i < SIZE - k; i++)
      for (let j = k; j < SIZE - k; j++) { min[i][j] -= 2; max[i][j] += 2; }
  return { min, max };
}

const BOUNDS = boardBounds();

function violates(b, i, j) {
  const h = b[i][j];
  return Math.abs(h - b[i - 1][j]) > 2 || Math.abs(h - b[i][j - 1]) > 2 ||
    Math.abs(h - b[i + 1][j]) > 2 || Math.abs(h - b[i][j + 1]) > 2 ||
    h > BOUNDS.max[i][j] || h < BOUNDS.min[i][j];
}

/**
 * True when every playable cell is within its bounds and within 2 units of its 4 neighbours.
 * @param {number[][]} board 12x12 heights
 */
export function isValidBoard(board) {
  for (let i = 1; i < SIZE - 1; i++)
    for (let j = 1; j < SIZE - 1; j++) if (violates(board, i, j)) return false;
  return true;
}

// gen_board: random +1/-1 pushes in [lo, hi), undone when they break the physics.
function genBoard(b, rng, push, lo, hi, factor) {
  let moves = 0, strikes = 0;
  while (moves < push) {
    const up = rng() >= factor;
    const i = randInt(rng, lo, hi), j = randInt(rng, lo, hi);
    b[i][j] += up ? 1 : -1;
    if (violates(b, i, j)) {
      b[i][j] -= up ? 1 : -1;
      if (++strikes >= 1e5) break; // same cap as gen_mix_board: never hang on a saturated region
    } else { moves++; strikes = 0; }
  }
}

// gen_mix_board: one half of the board only rises, the other only sinks.
function genMixBoard(b, rng, push) {
  const mix = grid(0);
  let xy = rng();
  if (xy >= 0.5) {
    for (let i = 1; i < 11; i++)
      for (let j = 1; j < 11; j++) {
        if (j > i) mix[i][j] = 1;
        else if (i === j) { xy = rng(); if (xy >= 0.5) mix[i][j] = 1; }
      }
  } else {
    for (let i = 1; i < 11; i++)
      for (let j = 1; j < 7; j++) {
        if (j < 5) mix[i][j] = 1;
        else { xy = rng(); if (xy >= 0.5) mix[i][j] = 1; }
      }
  }
  // np.rot90 twice = 180° rotation, applied when the last draw was >= 0.5
  const m = xy >= 0.5 ? mix.map((row, i) => row.map((_, j) => mix[SIZE - 1 - i][SIZE - 1 - j])) : mix;

  let moves = 0, strikes = 0;
  while (moves < push) {
    const i = randInt(rng, 1, 11), j = randInt(rng, 1, 11);
    const d = m[i][j] ? 1 : -1;
    b[i][j] += d;
    if (violates(b, i, j)) {
      b[i][j] -= d;
      if (++strikes >= 1e5) break;
    } else { moves++; strikes = 0; }
  }
}

// A few hills on a flat plain: repeated +1 pushes in a 3x3 window around random centres.
function genPeaks(b, rng, peaks) {
  for (let k = 0; k < peaks; k++) {
    const ci = randInt(rng, 2, 6), cj = randInt(rng, 2, 10); // top half: the board is mirrored afterwards
    for (let n = 0; n < 12; n++) {
      const i = ci + randInt(rng, -1, 2), j = cj + randInt(rng, -1, 2);
      b[i][j] += 1;
      if (violates(b, i, j)) b[i][j] -= 1;
    }
  }
}

// Fairness: both players face the same terrain. Rows 6..10 copy rows 5..1; rows 5 and 6 end up equal, and
// the ring bounds are symmetric, so the physics stays valid.
function mirror(b) {
  for (let i = 1; i <= 5; i++) b[SIZE - 1 - i] = [...b[i]];
  return b;
}

/**
 * Random fair board for a terrain mode, built with game.py's generator then mirrored top/bottom.
 * @param {string} modeId id from MODES
 * @param {() => number} [rng] uniform [0, 1) source, e.g. makeRng(seed)
 * @returns {number[][]} 12x12 heights with a 0 border
 */
export function generateBoard(modeId, rng = Math.random) {
  let m = MODES.find((x) => x.id === modeId);
  if (!m) throw new Error(`Terrain inconnu : ${modeId}`);
  if (m.id === 'random') m = MODES[1 + Math.floor(rng() * (MODES.length - 1))];
  const b = grid(0);
  if (m.kind === 'mix') genMixBoard(b, rng, 250);
  else if (m.kind === 'peaks') genPeaks(b, rng, m.peaks);
  else for (let k = 1; k <= 4; k++) genBoard(b, rng, m.push, k, SIZE - k, m.factor);
  return mirror(b);
}

/** Terrain color (0xRRGGBB) for a height in -10..10, from game.py's color_stick. */
export const colorForHeight = (h) => COLORS[Math.min(6, Math.max(0, Math.floor((h + 10) / 3)))];
