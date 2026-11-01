// Terrain generation, ported from game.py (gen_board, gen_mix_board, check_board, board_scramble).
// Board is SIZE x SIZE with a fixed border at height 0; playable cells are 1..10.

export const SIZE = 12;

export const LANDSCAPES = [
  { id: 1, group: 'Montagnes', name: 'Montagnes hautes', kind: 'scramble', factor: 0.15 },
  { id: 2, group: 'Montagnes', name: 'Montagnes moyennes', kind: 'scramble', factor: 0.225 },
  { id: 3, group: 'Montagnes', name: 'Montagnes basses', kind: 'scramble', factor: 0.3 },
  { id: 4, group: 'Forêts', name: 'Forêts hautes', kind: 'scramble', factor: 0.4 },
  { id: 5, group: 'Forêts', name: 'Forêts moyennes', kind: 'scramble', factor: 0.5 },
  { id: 6, group: 'Forêts', name: 'Forêts basses', kind: 'scramble', factor: 0.6 },
  { id: 7, group: 'Vallées', name: 'Vallées hautes', kind: 'scramble', factor: 0.7 },
  { id: 8, group: 'Vallées', name: 'Vallées moyennes', kind: 'scramble', factor: 0.775 },
  { id: 9, group: 'Vallées', name: 'Vallées basses', kind: 'scramble', factor: 0.85 },
  { id: 10, group: 'Spécial', name: 'Mont Everest', kind: 'max' },
  { id: 11, group: 'Spécial', name: 'Gasherbrum I', kind: 'scramble', factor: 0.1 },
  { id: 12, group: 'Spécial', name: 'Montagnes et vallées', kind: 'mix', factor: 0.5 },
  { id: 13, group: 'Spécial', name: 'Fosse des Kouriles', kind: 'scramble', factor: 0.9 },
  { id: 14, group: 'Spécial', name: 'Fosse des Mariannes', kind: 'min' },
];

/** Landscape selected when the page opens: Forêts moyennes. */
export const DEFAULT_LANDSCAPE = 5;

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

/**
 * Random board for a landscape, as game.py generates it.
 * @param {number} landscapeId id from LANDSCAPES
 * @param {() => number} [rng] uniform [0, 1) source
 * @returns {number[][]} 12x12 heights with a 0 border
 */
export function generateBoard(landscapeId, rng = Math.random) {
  const l = LANDSCAPES.find((x) => x.id === landscapeId);
  if (!l) throw new Error(`Terrain inconnu : ${landscapeId}`);
  if (l.kind === 'max') return boardBounds().max;
  if (l.kind === 'min') return boardBounds().min;
  const b = grid(0);
  if (l.kind === 'mix') genMixBoard(b, rng, 250);
  else for (let k = 1; k <= 4; k++) genBoard(b, rng, 150, k, SIZE - k, l.factor);
  return b;
}

/** Terrain color (0xRRGGBB) for a height in -10..10, from game.py's color_stick. */
export const colorForHeight = (h) => COLORS[Math.min(6, Math.max(0, Math.floor((h + 10) / 3)))];
