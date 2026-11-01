import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGameState, handleClick, handleExit, highlights, TEAM, square } from '../play.js';

const flat = () => Array.from({ length: 12 }, () => Array(12).fill(0));
const P = (id, type, team, r, c) => ({ id, type, team, r, c });
const start = (pieces) => {
  const s = newGameState(flat(), 'Bois');
  return pieces ? { ...s, pieces } : s;
};

test('labels: player colors, rows numbered from the bottom', () => {
  assert.deepEqual(TEAM, { red: 'rouge', blue: 'bleu' });
  assert.equal(square(10, 3), 'c1');
  assert.equal(square(1, 3), 'c10');
});
test('new game is announced with the terrain and who starts', () => {
  assert.match(start().message, /Nouvelle partie : Bois\. Le joueur 1 \(rouge\) commence/);
});
test('clicking an opponent piece says whose turn it is', () => {
  const s = handleClick(start(), 1, 3);
  assert.equal(s.selected, null);
  assert.match(s.message, /Au tour du joueur 1 \(rouge\)/);
});
test('selecting a piece shows its stats and highlights moves', () => {
  const s = handleClick(start(), 10, 4);
  assert.equal(s.selected, 'red-1');
  assert.match(s.message, /Avant-garde.*Mouvement 4, Force 2/);
  assert.ok(highlights(s).moves.some(([r, c]) => r === 6 && c === 4));
});
test('a move plays, passes the turn and reports it', () => {
  const s = handleClick(handleClick(start(), 10, 4), 7, 4);
  assert.equal(s.turn, 'blue');
  assert.match(s.message, /Avant-garde rouge d1 → d4.*Au tour du joueur 2 \(bleu\)/);
});
test('out of range keeps the selection and says so', () => {
  const s = handleClick(handleClick(start(), 10, 4), 2, 9);
  assert.equal(s.selected, 'red-1');
  assert.match(s.message, /hors de portée/);
});
test('a too-weak attack is refused with the strengths', () => {
  const pcs = [P('re', 'explorer', 'red', 5, 5), P('bs', 'sentinel', 'blue', 5, 6), P('bx', 'explorer', 'blue', 1, 1)];
  const s = handleClick(handleClick(start(pcs), 5, 5), 5, 6);
  assert.equal(s.turn, 'red');
  assert.match(s.message, /Attaque impossible : force 1 contre 3/);
  assert.ok(!highlights(handleClick(start(pcs), 5, 5)).attacks.length);
});
test('an allowed attack captures and reports the strengths', () => {
  const pcs = [P('rs', 'sentinel', 'red', 5, 5), P('be', 'explorer', 'blue', 5, 6), P('bx', 'explorer', 'blue', 1, 1)];
  const sel = handleClick(start(pcs), 5, 5);
  assert.deepEqual(highlights(sel).attacks, [[5, 6]]);
  const s = handleClick(sel, 5, 6);
  assert.match(s.message, /Sentinelle rouge capture Explorateur bleu \(3 contre 1\)/);
});
test('exit is offered on the last row and scores the strength', () => {
  const pcs = [P('rv', 'vanguard', 'red', 1, 5), P('bx', 'explorer', 'blue', 5, 1)];
  const sel = handleClick(start(pcs), 1, 5);
  assert.equal(highlights(sel).canExit, true);
  const s = handleExit(sel);
  assert.equal(s.scores.red, 2);
  assert.match(s.message, /Avant-garde rouge franchit l'arrivée : \+2/);
});
test('a sentinel arriving first wins at once, then clicks do nothing', () => {
  const pcs = [P('rs', 'sentinel', 'red', 1, 5), P('bx', 'explorer', 'blue', 5, 1)];
  const s = handleExit(handleClick(start(pcs), 1, 5));
  assert.equal(s.winner, 'red');
  assert.match(s.message, /Sentinelle rouge arrive la première : victoire du joueur 1 \(rouge\)/);
  assert.equal(handleClick(s, 5, 1), s);
});
test('a blocked piece explains itself', () => {
  const b = flat(); b[2][1] = -2; b[1][2] = -2;          // blue sentinel in a corner, surrounded by deep drops
  const pcs = [P('bs', 'sentinel', 'blue', 1, 1), P('bv', 'vanguard', 'blue', 9, 9), P('rx', 'explorer', 'red', 5, 5)];
  const pcs2 = [...pcs, P('w1', 'vanguard', 'blue', 2, 1), P('w2', 'vanguard', 'blue', 1, 2)];
  const s = handleClick({ ...newGameState(b, 'Bois'), pieces: pcs2, turn: 'blue' }, 1, 1);
  assert.equal(s.selected, null);
  assert.match(s.message, /bloquée/);
});
