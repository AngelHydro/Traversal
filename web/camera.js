// Board geometry and camera framing, free of Three.js so they can be unit-tested.

/** World height of one terrain unit. */
export const HEIGHT_UNIT = 0.5;
/**
 * Default viewing direction (from the board towards the camera): steep enough (~63°) that a taller
 * row in front does not hide the far side's pieces.
 */
export const VIEW_DIR = [0, 2, 1];

/**
 * World y of the bottom of the columns: one unit below the board's lowest cell, so a high board is not drawn
 * (and framed) on a tall empty base.
 * @param {number[][]} board 12x12 heights, playable cells 1..10
 */
export function floorFor(board) {
  let low = Infinity;
  for (let r = 1; r <= 10; r++) for (let c = 1; c <= 10; c++) low = Math.min(low, board[r][c]);
  return (low - 1) * HEIGHT_UNIT;
}

/**
 * Box of the rendered board: the 10x10 footprint, from the floor to the tallest column.
 * @param {number[][]} board 12x12 heights, playable cells 1..10
 * @returns {{center: number[], half: number[]}} centre and half-sizes [x, y, z]
 */
export function boardBox(board) {
  let top = -Infinity;
  for (let r = 1; r <= 10; r++) for (let c = 1; c <= 10; c++) top = Math.max(top, board[r][c] * HEIGHT_UNIT);
  const floor = floorFor(board);
  const halfY = (top - floor) / 2;
  return { center: [0, floor + halfY, 0], half: [5, halfY, 5] };
}

/**
 * Camera placement, looking at the box's centre from direction `dir`, at the smallest distance that keeps
 * all eight corners of the box on screen (with a small margin). Tighter than framing a bounding sphere.
 * @param {number[]} center box centre [x, y, z]
 * @param {number[]} half box half-sizes [x, y, z]
 * @param {number} fovDeg vertical field of view, degrees
 * @param {number} aspect viewport width / height
 * @param {number[]} dir direction from the target towards the camera (any length)
 * @param {number} [margin=1.05] extra room around the box
 * @returns {{position: number[], target: number[]}}
 */
export function fitCamera(center, half, fovDeg, aspect, dir, margin = 1.05) {
  const len = Math.hypot(...dir);
  const back = dir.map((x) => x / len);
  const f = back.map((x) => -x);
  let right = [-f[2], 0, f[0]];                         // f x up, up = [0, 1, 0]
  const rl = Math.hypot(...right);
  right = rl < 1e-9 ? [1, 0, 0] : right.map((x) => x / rl);
  const up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const tv = Math.tan((fovDeg * Math.PI) / 360) / margin, th = tv * aspect;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let distance = 0;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const q = [sx * half[0], sy * half[1], sz * half[2]];
    const z = dot(q, f);
    distance = Math.max(distance, Math.abs(dot(q, right)) / th - z, Math.abs(dot(q, up)) / tv - z);
  }
  return { position: center.map((x, i) => x + back[i] * distance), target: [...center] };
}

/**
 * Zoom range for a framed camera distance: zooming out stops a little past the framed view, so the board
 * never becomes tiny; zooming in stops before the camera enters the board.
 * @param {number} distance framed distance from the target
 */
export const zoomLimits = (distance) => ({ min: distance * 0.4, max: distance * 1.2 });

/** Lowest the camera may orbit (radians from straight above): never below the board's edge. */
export const MAX_POLAR = 1.3;
