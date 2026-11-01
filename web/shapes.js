// Piece shapes from the rule sheet, without Three.js: "the Movement of a piece is the number of sides of
// its base, its Strength the number of spikes on top".
import { PIECES } from './rules.js';

/** Base sides and top spikes of a piece type. */
export const pieceShape = (type) => ({ sides: PIECES[type].move, spikes: PIECES[type].strength });

/** Spike positions [x, z] on top of the base: one in the centre, otherwise evenly spaced on a circle. */
export function spikePositions(n, radius) {
  if (n === 1) return [[0, 0]];
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n + Math.PI / 2;
    return [radius * Math.cos(a), radius * Math.sin(a)];
  });
}
