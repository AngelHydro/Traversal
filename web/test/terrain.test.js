import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBoard, isValidBoard, colorForHeight, imbalance, MODES, DEFAULT_MODE, makeRng, SIZE } from '../terrain.js';

const cells = (b) => b.slice(1, 11).flatMap((row) => row.slice(1, 11));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

test('the six terrain modes of the rules, random by default', () => {
  assert.deepEqual(MODES.map((m) => [m.id, m.name]), [
    ['random', 'Aléatoire'], ['mountains', 'Montagnes'], ['valleys', 'Vallées'],
    ['highlands', 'Hautes terres'], ['woods', 'Bois'], ['desert', 'Désert']]);
  assert.equal(DEFAULT_MODE, 'random');
});

const mirrored = (b) => b.every((row, r) => r < 1 || r > 10 || row.every((v, c) => v === b[11 - r][c]));

test('every mode gives valid boards, fast', () => {
  for (const { id } of MODES) for (let seed = 1; seed <= 30; seed++) {
    const t = Date.now();
    const b = generateBoard(id, makeRng(seed));
    assert.ok(Date.now() - t < 500, `${id} too slow`);
    assert.equal(b.length, SIZE);
    assert.ok(isValidBoard(b), `${id} seed ${seed}`);
    for (let i = 0; i < SIZE; i++) for (const v of [b[0][i], b[11][i], b[i][0], b[i][11]]) assert.equal(v, 0);
  }
});

test('boards stay random: no forced symmetry', () => {
  for (const id of ['mountains', 'valleys', 'highlands', 'woods', 'desert'])
    assert.ok(Array.from({ length: 20 }, (_, s) => mirrored(generateBoard(id, makeRng(s + 1)))).filter(Boolean).length <= 2, id);
});

test('imbalance is 0 on a symmetric board and grows when one side has it harder', () => {
  const b = Array.from({ length: 12 }, () => Array(12).fill(0));
  assert.equal(imbalance(b), 0);
  b[9][5] = 2; b[2][5] = 2;
  assert.equal(imbalance(b), 0);
  for (let c = 1; c <= 10; c++) b[9][c] = 2;          // a ridge across red's half only
  assert.ok(imbalance(b) > 2);
});

test('the most balanced of several random boards is kept', () => {
  for (const { id } of MODES) {
    const kept = Array.from({ length: 15 }, (_, s) => imbalance(generateBoard(id, makeRng(s + 1))));
    const raw = Array.from({ length: 15 }, (_, s) => imbalance(generateBoard(id, makeRng(s + 1), 1)));
    assert.ok(mean(kept) <= mean(raw) / 2 + 0.05, `${id}: kept ${mean(kept).toFixed(2)} vs raw ${mean(raw).toFixed(2)}`);
    assert.ok(Math.max(...kept) <= 1.5, `${id}: worst kept ${Math.max(...kept).toFixed(2)}`);
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

test('Aléatoire draws one terrain mode, uniformly, then builds the whole board with it', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const r = makeRng(seed);
    const sub = MODES[1 + Math.floor(r() * (MODES.length - 1))];
    seen.add(sub.id);
    assert.deepEqual(generateBoard('random', makeRng(seed)), generateBoard(sub.id, r), `seed ${seed}`);
  }
  assert.equal(seen.size, MODES.length - 1);
});
