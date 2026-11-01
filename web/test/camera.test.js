import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardSphere, fitCamera, FLOOR, HEIGHT_UNIT } from '../camera.js';
import { boardBounds } from '../terrain.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('boardSphere encloses every column, floor to tallest top', () => {
  const { center, radius } = boardSphere(boardBounds().max);   // tallest top = 10 units
  for (const [x, y, z] of [[-5, FLOOR, -5], [5, 10 * HEIGHT_UNIT, 5], [5, FLOOR, -5]])
    assert.ok(dist(center, [x, y, z]) <= radius + 1e-9);
});
test('fitCamera puts the whole sphere inside the view cone', () => {
  const { position, target } = fitCamera([0, 0, 0], 5, 90, 1, [0, 1, 1], 1);
  assert.deepEqual(target, [0, 0, 0]);
  assert.ok(Math.abs(dist(position, target) - 5 / Math.sin(Math.PI / 4)) < 1e-9);
});
test('fitCamera backs off more on a portrait screen', () => {
  const land = fitCamera([0, 0, 0], 5, 45, 16 / 9, [0, 1, 1]);
  const port = fitCamera([0, 0, 0], 5, 45, 9 / 16, [0, 1, 1]);
  assert.ok(dist(port.position, [0, 0, 0]) > dist(land.position, [0, 0, 0]));
});
test('fitCamera keeps the given viewing direction', () => {
  const { position } = fitCamera([1, 2, 3], 5, 45, 1, [0, 0, 2]);
  assert.equal(position[0], 1); assert.equal(position[1], 2); assert.ok(position[2] > 3);
});
