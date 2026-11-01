// Board geometry and camera framing, free of Three.js so they can be unit-tested.

/** World height of one terrain unit. */
export const HEIGHT_UNIT = 0.5;
/** World y of the bottom of every column (one unit below the lowest possible height, -10). */
export const FLOOR = -11 * HEIGHT_UNIT;

/**
 * Bounding sphere of the rendered board: the 10x10 footprint from the floor to the tallest column.
 * @param {number[][]} board 12x12 heights, playable cells 1..10
 * @returns {{center: number[], radius: number}}
 */
export function boardSphere(board) {
  let top = -Infinity;
  for (let r = 1; r <= 10; r++) for (let c = 1; c <= 10; c++) top = Math.max(top, board[r][c] * HEIGHT_UNIT);
  const halfY = (top - FLOOR) / 2;
  return { center: [0, FLOOR + halfY, 0], radius: Math.hypot(5, 5, halfY) };
}

/**
 * Camera placement that shows the whole sphere, looking at its centre from direction `dir`.
 * @param {number[]} center sphere centre [x, y, z]
 * @param {number} radius sphere radius
 * @param {number} fovDeg vertical field of view, degrees
 * @param {number} aspect viewport width / height
 * @param {number[]} dir direction from the target towards the camera (any length)
 * @param {number} [margin=1.05] extra room around the sphere
 * @returns {{position: number[], target: number[]}}
 */
export function fitCamera(center, radius, fovDeg, aspect, dir, margin = 1.05) {
  const v = (fovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  const distance = (radius * margin) / Math.sin(Math.min(v, h) / 2);
  const len = Math.hypot(...dir);
  return { position: center.map((x, i) => x + (dir[i] / len) * distance), target: [...center] };
}
