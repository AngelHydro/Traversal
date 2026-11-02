import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES } from '../shapes.js';

test('pieces are plain solids named by the rule sheet', () => {
  assert.equal(SHAPES.explorer.kind, 'frustum');          // cône pentagonal
  assert.equal(SHAPES.explorer.sides, 5);
  assert.ok(SHAPES.explorer.top < SHAPES.explorer.bottom, 'narrows upwards');
  assert.equal(SHAPES.vanguard.kind, 'prism');            // coin: a block with one top corner cut
  assert.equal(SHAPES.vanguard.profile.length, 5);
  assert.equal(SHAPES.sentinel.kind, 'prism');            // prisme triangulaire
  assert.equal(SHAPES.sentinel.profile.length, 3);
});

test('every piece fits inside its cell and stands on it', () => {
  for (const [type, s] of Object.entries(SHAPES)) {
    const xs = s.kind === 'frustum' ? [-s.bottom, s.bottom] : s.profile.map(([x]) => x);
    const ys = s.kind === 'frustum' ? [0, s.height] : s.profile.map(([, y]) => y);
    assert.ok(Math.max(...xs.map(Math.abs)) <= 0.4, `${type} too wide`);
    assert.equal(Math.min(...ys), 0, `${type} stands on the cell`);
    assert.ok(Math.max(...ys) <= 0.6, `${type} too tall`);
    if (s.kind === 'prism') assert.ok(s.depth <= 0.8);
  }
});
