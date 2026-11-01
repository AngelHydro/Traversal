import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBoard, isValidBoard, colorForHeight, MODES, DEFAULT_MODE, makeRng, SIZE } from '../terrain.js';

const cells = (b) => b.slice(1, 11).flatMap((row) => row.slice(1, 11));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

test('the six terrain modes of the rules, random by default', () => {
  assert.deepEqual(MODES.map((m) => [m.id, m.name]), [
    ['random', 'Aléatoire'], ['mountains', 'Montagnes'], ['valleys', 'Vallées'],
    ['highlands', 'Hautes terres'], ['woods', 'Bois'], ['desert', 'Désert']]);
  assert.equal(DEFAULT_MODE, 'random');
});

test('every mode gives valid, fair (mirrored top/bottom) boards, fast', () => {
  for (const { id } of MODES) for (let seed = 1; seed <= 30; seed++) {
    const t = Date.now();
    const b = generateBoard(id, makeRng(seed));
    assert.ok(Date.now() - t < 500, `${id} too slow`);
    assert.equal(b.length, SIZE);
    assert.ok(isValidBoard(b), `${id} seed ${seed}`);
    for (let r = 1; r <= 10; r++) for (let c = 1; c <= 10; c++) assert.equal(b[r][c], b[11 - r][c], `${id} not mirrored`);
    for (let i = 0; i < SIZE; i++) for (const v of [b[0][i], b[11][i], b[i][0], b[i][11]]) assert.equal(v, 0);
  }
});

test('a seed always gives the same board (shareable maps)', () => {
  assert.deepEqual(generateBoard('highlands', makeRng(7)), generateBoard('highlands', makeRng(7)));
  assert.notDeepEqual(generateBoard('highlands', makeRng(7)), generateBoard('highlands', makeRng(8)));
});

test('modes have their character', () => {
  const avg = (id, f) => mean(Array.from({ length: 20 }, (_, s) => f(cells(generateBoard(id, makeRng(s + 1))))));
  assert.ok(avg('mountains', mean) > 1, 'mountains rise');
  assert.ok(avg('valleys', mean) < -1, 'valleys sink');
  assert.ok(avg('desert', (xs) => xs.filter((x) => x === 0).length / xs.length) > 0.6, 'desert mostly flat');
  assert.ok(avg('desert', (xs) => Math.max(...xs)) >= 2, 'desert has a few peaks');
  assert.ok(avg('woods', (xs) => Math.max(...xs.map(Math.abs))) <= 4, 'woods gentle');
});

test('colorForHeight covers -10..10', () => {
  assert.equal(colorForHeight(-10), 0x000080);
  assert.equal(colorForHeight(0), 0x008000);
  assert.equal(colorForHeight(10), 0x87ceeb);
});
