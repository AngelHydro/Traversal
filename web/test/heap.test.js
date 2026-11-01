import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MinHeap } from '../heap.js';

test('MinHeap pops entries by increasing priority', () => {
  const h = new MinHeap();
  for (const p of [5, 1, 4, 1, 3, 9, 2]) h.push([p, `x${p}`]);
  const out = [];
  while (h.size) out.push(h.pop()[0]);
  assert.deepEqual(out, [1, 1, 2, 3, 4, 5, 9]);
});
