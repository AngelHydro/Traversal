import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBoard, isValidBoard, colorForHeight, LANDSCAPES, SIZE } from '../terrain.js';

function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

test('every landscape generates a valid board', () => {
  for (const { id } of LANDSCAPES) {
    const t = Date.now();
    const b = generateBoard(id, seeded(id));
    assert.equal(b.length, SIZE);
    assert.ok(isValidBoard(b), `landscape ${id}`);
    assert.ok(Date.now() - t < 1000, `landscape ${id} too slow`);
    for (let i = 0; i < SIZE; i++) for (const v of [b[0][i], b[11][i], b[i][0], b[i][11]]) assert.equal(v, 0);
  }
});
test('Everest is the max board, Mariana the min', () => {
  assert.equal(generateBoard(10)[5][5], 10);
  assert.equal(generateBoard(14)[5][5], -10);
  assert.equal(generateBoard(10)[1][1], 2);
});
test('isValidBoard rejects a step of 3', () => {
  const b = generateBoard(10); b[1][1] = -1;
  assert.equal(isValidBoard(b), false);
});
test('colorForHeight covers -10..10', () => {
  assert.equal(colorForHeight(-10), 0x000080);
  assert.equal(colorForHeight(0), 0x008000);
  assert.equal(colorForHeight(10), 0x87ceeb);
});
test('generation terminates even when every push fails', () => {
  const b = generateBoard(1, () => 0.999);   // always up, always the same cell
  assert.ok(isValidBoard(b));
});
test('DEFAULT_LANDSCAPE is Forêts moyennes', async () => {
  const { DEFAULT_LANDSCAPE } = await import('../terrain.js');
  assert.equal(LANDSCAPES.find((l) => l.id === DEFAULT_LANDSCAPE)?.name, 'Forêts moyennes');
});
