import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, baseSides, facing } from '../shapes.js';
import { PIECES } from '../rules.js';

test('pieces are plain solids named by the rule sheet', () => {
  assert.deepEqual([SHAPES.explorer.kind, SHAPES.explorer.sides], ['frustum', 5]);   // cône pentagonal
  assert.ok(SHAPES.explorer.top < SHAPES.explorer.bottom, 'narrows upwards');
  assert.deepEqual([SHAPES.sentinel.kind, SHAPES.sentinel.sides], ['frustum', 3]);   // prisme triangulaire, standing
  assert.equal(SHAPES.sentinel.top, SHAPES.sentinel.bottom, 'a prism: straight sides');
  assert.equal(SHAPES.vanguard.kind, 'prism');                                        // coin...
  assert.equal(SHAPES.vanguard.turn, Math.PI / 4);                                    // ...en losange
});

test('the base has as many sides as the piece has Movement (rule sheet)', () => {
  for (const [type, { move }] of Object.entries(PIECES)) assert.equal(baseSides(SHAPES[type]), move, type);
});

test('each team faces its direction of travel', () => {
  assert.equal(facing('red'), 0);
  assert.equal(facing('blue'), Math.PI);
});

test('every piece fits inside its cell and stands on it', () => {
  for (const [type, s] of Object.entries(SHAPES)) {
    const xs = s.kind === 'frustum' ? [-s.bottom, s.bottom] : s.profile.map(([x]) => x);
    const ys = s.kind === 'frustum' ? [0, s.height] : s.profile.map(([, y]) => y);
    const reach = s.kind === 'prism' ? Math.hypot(Math.max(...xs.map(Math.abs)), s.depth / 2) : Math.max(...xs.map(Math.abs));
    assert.ok(reach <= 0.45, `${type} too wide`);
    assert.equal(Math.min(...ys), 0, `${type} stands on the cell`);
    assert.ok(Math.max(...ys) <= 0.6, `${type} too tall`);
  }
});
