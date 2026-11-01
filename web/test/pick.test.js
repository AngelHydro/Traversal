import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickCell, createClickTracker } from '../pick.js';

const hit = (kind, r, c) => ({ object: { userData: { kind, r, c } } });

test('pickCell: nearer own piece beats a farther highlight', () => {
  assert.deepEqual(pickCell([hit('piece', 2, 2), hit('target', 3, 3)]), [2, 2]);
});
test('pickCell: highlight hidden behind a column still wins', () => {
  assert.deepEqual(pickCell([hit('cell', 9, 5), hit('target', 8, 5)]), [8, 5]);
});
test('pickCell: falls back to the nearest cell, null when nothing', () => {
  assert.deepEqual(pickCell([hit('cell', 4, 4), hit('cell', 5, 5)]), [4, 4]);
  assert.equal(pickCell([{ object: { userData: {} } }]), null);
});
test('click tracker: tap is a click, drag is not', () => {
  const t = createClickTracker(5);
  t.down({ pointerId: 1, clientX: 0, clientY: 0 });
  assert.equal(t.up({ pointerId: 1, clientX: 3, clientY: 0 }), true);
  t.down({ pointerId: 1, clientX: 0, clientY: 0 });
  assert.equal(t.up({ pointerId: 1, clientX: 30, clientY: 0 }), false);
});
test('click tracker: a pinch (two pointers) never clicks', () => {
  const t = createClickTracker(5);
  t.down({ pointerId: 1, clientX: 0, clientY: 0 });
  t.down({ pointerId: 2, clientX: 100, clientY: 0 });
  assert.equal(t.up({ pointerId: 2, clientX: 100, clientY: 0 }), false);
  assert.equal(t.up({ pointerId: 1, clientX: 0, clientY: 0 }), false);
  t.down({ pointerId: 3, clientX: 0, clientY: 0 });
  assert.equal(t.up({ pointerId: 3, clientX: 0, clientY: 0 }), true);
});
test('pickCell: the raised selected piece does not hide a target behind it', () => {
  const sel = { object: { userData: { kind: 'piece', selected: true, r: 10, c: 5 } } };
  assert.deepEqual(pickCell([sel, hit('target', 9, 5)]), [9, 5]);
  assert.deepEqual(pickCell([sel, hit('cell', 9, 5)]), [10, 5]);  // no target: still deselects
});
