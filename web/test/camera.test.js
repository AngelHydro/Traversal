import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardBox, fitCamera, zoomLimits, floorFor, HEIGHT_UNIT } from '../camera.js';
import { boardBounds } from '../terrain.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => a.map((x) => x / Math.hypot(...a));
const corners = ({ center, half }) => [-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => [-1, 1].map((sz) =>
  [center[0] + sx * half[0], center[1] + sy * half[1], center[2] + sz * half[2]])));
// Normalised screen position of a point seen from a camera looking at `target` (|x|, |y| <= 1 = on screen).
function project(p, position, target, fovDeg, aspect) {
  const f = norm(sub(target, position)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const v = sub(p, position), z = dot(v, f), t = Math.tan((fovDeg * Math.PI) / 360);
  return [dot(v, r) / (z * t * aspect), dot(v, u) / (z * t)];
}

test('boardBox spans the 10x10 footprint from the floor to the tallest column', () => {
  const b = boardBounds().max;
  const { center, half } = boardBox(b);
  assert.equal(half[0], 5); assert.equal(half[2], 5);
  assert.equal(center[1] - half[1], floorFor(b));
  assert.equal(center[1] + half[1], 10 * HEIGHT_UNIT);
});

test('fitCamera keeps every corner of the board on screen, for wide and tall screens', () => {
  const box = boardBox(boardBounds().max);
  for (const aspect of [16 / 9, 1, 9 / 16]) {
    const { position, target } = fitCamera(box.center, box.half, 45, aspect, [0, 2, 1]);
    const pts = corners(box).map((p) => project(p, position, target, 45, aspect));
    assert.ok(pts.every(([x, y]) => Math.abs(x) <= 1 && Math.abs(y) <= 1), `aspect ${aspect}`);
    assert.ok(pts.some(([x, y]) => Math.max(Math.abs(x), Math.abs(y)) > 0.9), 'tight: some corner near the edge');
  }
});

test('fitCamera is tighter than framing the bounding sphere (the board looks bigger)', () => {
  const box = boardBox(boardBounds().max);
  const { position, target } = fitCamera(box.center, box.half, 45, 16 / 9, [0, 2, 1]);
  const sphere = (Math.hypot(...box.half) * 1.05) / Math.sin((45 * Math.PI) / 360);
  assert.ok(dist(position, target) < sphere * 0.85);
});

test('fitCamera backs off more on a portrait screen and keeps the viewing direction', () => {
  const box = boardBox(boardBounds().max);
  const land = fitCamera(box.center, box.half, 45, 16 / 9, [0, 2, 1]);
  const port = fitCamera(box.center, box.half, 45, 9 / 16, [0, 2, 1]);
  assert.ok(dist(port.position, port.target) > dist(land.position, land.target));
  const d = norm(sub(land.position, land.target));
  assert.ok(Math.abs(d[0]) < 1e-9 && Math.abs(d[1] - 2 / Math.sqrt(5)) < 1e-9);
});

test('zoom is limited: never further than a little past the framed view, never inside the board', () => {
  assert.deepEqual(zoomLimits(20), { min: 8, max: 24 });
});

test('the base of the board starts one unit under its lowest cell, so a high board is not framed with a tall empty base', () => {
  const b = Array.from({ length: 12 }, () => Array(12).fill(4));
  b[3][3] = 2;
  assert.equal(floorFor(b), 1 * HEIGHT_UNIT);
  assert.ok(boardBox(b).half[1] < boardBox(boardBounds().min).half[1] + 3);
});
