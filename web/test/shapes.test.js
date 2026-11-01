import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pieceShape, spikePositions } from '../shapes.js';
import { PIECES } from '../rules.js';

test('a piece shows its stats: base sides = Movement, top spikes = Strength', () => {
  for (const [type, { move, strength }] of Object.entries(PIECES))
    assert.deepEqual(pieceShape(type), { sides: move, spikes: strength }, type);
});

test('spikes: one in the centre, otherwise evenly spaced inside the base', () => {
  assert.deepEqual(spikePositions(1, 0.2), [[0, 0]]);
  for (const n of [2, 3]) {
    const ps = spikePositions(n, 0.2);
    assert.equal(ps.length, n);
    for (const [x, z] of ps) assert.ok(Math.abs(Math.hypot(x, z) - 0.2) < 1e-9);
  }
});
