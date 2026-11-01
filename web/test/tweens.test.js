import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTweens } from '../tweens.js';

test('a tween runs from 0 to 1 over its duration, then calls done', () => {
  const tw = createTweens(() => 0);
  const seen = [];
  let done = false;
  tw.tween(100, (k) => seen.push(k), () => { done = true; });
  tw.run(50); tw.run(100); tw.run(150);
  assert.deepEqual(seen, [0.5, 1]);
  assert.equal(done, true);
});
test('a delayed tween waits; a cancelled tween never runs nor finishes', () => {
  const tw = createTweens(() => 0);
  const seen = [];
  tw.tween(100, (k) => seen.push(['late', k]), () => {}, 100);
  const t = tw.tween(100, (k) => seen.push(['gone', k]), () => seen.push('done'));
  tw.cancel(t);
  tw.run(50); tw.run(200);
  assert.deepEqual(seen, [['late', 1]]);
});
test('with animations off, a tween jumps to its end at once and returns no handle', () => {
  const tw = createTweens(() => 0);
  tw.setEnabled(false);
  const seen = [];
  assert.equal(tw.tween(100, (k) => seen.push(k), () => seen.push('done')), null);
  assert.deepEqual(seen, [1, 'done']);
});
test('clear drops every running tween', () => {
  const tw = createTweens(() => 0);
  let ran = false;
  tw.tween(100, () => { ran = true; });
  tw.clear();
  tw.run(50);
  assert.equal(ran, false);
});
