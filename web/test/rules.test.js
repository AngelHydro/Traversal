import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canStep, legalMoves, initialPieces, movePiece, winner } from '../rules.js';
import { boardBounds } from '../terrain.js';

const flat = () => Array.from({ length: 12 }, () => Array(12).fill(0));
const p = (r, c, team = 'black') => ({ id: `${team}${r}${c}`, type: 'soldier', team, r, c });

test('canStep follows the elevation rule', () => {
  assert.deepEqual([2, 1, 0, -1, -2, -3].map(d => canStep(0, d)), [false, true, true, true, true, false]);
});
test('legalMoves rejects off-board cells', () => {
  assert.deepEqual(legalMoves(flat(), [p(1, 1)], p(1, 1)).sort(), [[1, 2], [2, 1]]);
});
test('legalMoves rejects own pieces, allows capturing enemies', () => {
  const pcs = [p(5, 5), p(5, 6, 'red'), p(5, 4)];
  const moves = legalMoves(flat(), pcs, pcs[0]);
  assert.equal(moves.some(([r, c]) => r === 5 && c === 6), true);
  assert.equal(moves.some(([r, c]) => r === 5 && c === 4), false);
});
test('capture still obeys elevation', () => {
  const b = flat(); b[5][6] = 2;
  const pcs = [p(5, 5), p(5, 6, 'red')];
  assert.equal(legalMoves(b, pcs, pcs[0]).some(([r, c]) => r === 5 && c === 6), false);
});
test('legalMoves rejects climbing 2', () => {
  const b = boardBounds().max;           // [1][1]=2, [2][2]=4
  const b2 = b.map(row => [...row]); b2[2][1] = 4; b2[1][2] = 3;
  assert.deepEqual(legalMoves(b2, [p(1, 1)], p(1, 1)), [[1, 2]]);
});
test('initialPieces: 10 per team, black on row 1', () => {
  const pcs = initialPieces();
  assert.equal(pcs.filter(x => x.team === 'black' && x.r === 1).length, 10);
  assert.equal(pcs.filter(x => x.team === 'red' && x.r === 10).length, 10);
});
test('movePiece does not mutate', () => {
  const pcs = [p(5, 5)];
  const out = movePiece(pcs, pcs[0].id, 5, 6);
  assert.equal(pcs[0].c, 5); assert.equal(out[0].c, 6);
});
test('movePiece removes the captured piece', () => {
  const pcs = [p(5, 5), p(5, 6, 'red')];
  const out = movePiece(pcs, pcs[0].id, 5, 6);
  assert.equal(out.length, 1);
  assert.equal(out[0].team, 'black');
});
test('winner: reaching the far row wins', () => {
  assert.equal(winner(flat(), [p(10, 3), p(5, 5, 'red')], 'red'), 'black');
  assert.equal(winner(flat(), [p(5, 5), p(1, 3, 'red')], 'black'), 'red');
  assert.equal(winner(flat(), [p(5, 5), p(6, 6, 'red')], 'red'), null);
});
test('winner: side with no legal move loses', () => {
  assert.equal(winner(flat(), [p(5, 5)], 'red'), 'black');   // red has no pieces
  const b = flat(); b[4][5] = b[6][5] = b[5][4] = b[5][6] = 2;
  assert.equal(winner(b, [p(5, 5, 'red'), p(2, 2)], 'red'), 'black');
});
