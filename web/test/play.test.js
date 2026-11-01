import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGameState, handleClick, highlights, actionChoices, playChoice, TEAM, square } from '../play.js';

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
  assert.ok(highlights(s).moves.some(({ to: [r, c], cost }) => r === 6 && c === 4 && cost === 4));
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
test('exit: the cells past the finish line are highlighted; clicking one exits and scores', () => {
  const pcs = [P('rv', 'vanguard', 'red', 1, 5), P('bx', 'explorer', 'blue', 5, 1)];
  const sel = handleClick(start(pcs), 1, 5);
  assert.ok(highlights(sel).exits.some(({ to: [r, c], cost }) => r === 0 && c === 5 && cost === 1));
  assert.match(sel.message, /au-delà de l'arrivée/);
  const s = handleClick(sel, 0, 5);
  assert.equal(s.scores.red, 2);
  assert.match(s.message, /Avant-garde rouge franchit l'arrivée : \+2/);
});
test('a sentinel arriving first wins at once, then clicks do nothing', () => {
  const pcs = [P('rs', 'sentinel', 'red', 1, 5), P('bx', 'explorer', 'blue', 5, 1)];
  const s = handleClick(handleClick(start(pcs), 1, 5), 0, 5);
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
test('each reachable cell is highlighted once, even when an explorer has two ways to reach it', () => {
  const s = handleClick(start([P('re', 'explorer', 'red', 5, 5), P('bx', 'explorer', 'blue', 1, 1)]), 5, 5);
  const keys = highlights(s).moves.map(({ to: [r, c] }) => `${r},${c}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes('4,4'));
});
test('refused attacks are listed apart, and the selection message gives every attack\'s strengths', () => {
  const pcs = [P('rv', 'vanguard', 'red', 5, 5), P('bs', 'sentinel', 'blue', 5, 6), P('be', 'explorer', 'blue', 4, 5), P('bx', 'explorer', 'blue', 1, 1)];
  const s = handleClick(start(pcs), 5, 5);
  const hl = highlights(s);
  assert.deepEqual(hl.attacks, [[4, 5]]);
  assert.deepEqual(hl.refused, [[5, 6]]);
  assert.match(s.message, /Attaques : e7 2 contre 1, f6 2 contre 3 \(trop fort\)/);
});
test('keyboard play: every legal action of the side to move, described in words', () => {
  const pcs = [P('rv', 'vanguard', 'red', 2, 5), P('rs', 'sentinel', 'red', 5, 5), P('be', 'explorer', 'blue', 5, 6), P('bx', 'explorer', 'blue', 9, 9)];
  const choices = actionChoices(start(pcs));
  const labels = choices.map((c) => c.label);
  assert.equal(labels.filter((l) => /franchir/.test(l)).length, 1, 'one exit entry per piece');
  assert.ok(labels.includes('Avant-garde rouge e9 (hauteur 0) : franchir l\'arrivée (+2)'));
  assert.ok(labels.includes('Sentinelle rouge e6 (hauteur 0) : attaquer Explorateur bleu en f6 (3 contre 1)'));
  assert.ok(labels.some((l) => /^Sentinelle rouge e6 \(hauteur 0\) : aller en e7 \(coût 1\)$/.test(l)));
  assert.ok(choices.every((c) => c.pieceId.startsWith('r')));
  const s = playChoice(start(pcs), choices.find((c) => /franchir/.test(c.label)));
  assert.equal(s.scores.red, 2);
  assert.match(s.message, /franchit l'arrivée/);
});
test('each played move records what happened, for the animations', () => {
  const pcs = [P('rs', 'sentinel', 'red', 5, 5), P('be', 'explorer', 'blue', 5, 7), P('bx', 'explorer', 'blue', 1, 1)];
  const s = handleClick(handleClick(start(pcs), 5, 5), 5, 7);
  assert.equal(s.last.pieceId, 'rs');
  assert.equal(s.last.action.kind, 'attack');
  assert.equal(s.last.targetId, 'be');
  assert.deepEqual(s.last.path, [[5, 5], [5, 6], [5, 7]]);
  assert.equal(start().last, null);
});
test('cells only reachable by an explorer special move are flagged, so they can be drawn apart', () => {
  const b = flat();                                         // checkerboard 0/2: every step costs 3
  for (let r = 1; r <= 10; r++) for (let c = 1; c <= 10; c++) b[r][c] = (r + c) % 2 ? 0 : 2;
  const pcs = [P('re', 'explorer', 'red', 5, 5), P('bx', 'explorer', 'blue', 1, 1)];
  const hl = highlights(handleClick({ ...newGameState(b, 'Bois'), pieces: pcs }, 5, 5));
  const cell = (r, c) => hl.moves.find(({ to }) => to[0] === r && to[1] === c);
  assert.deepEqual(cell(4, 5), { to: [4, 5], cost: 3 });               // one step: normal, with its cost
  assert.deepEqual(cell(3, 5), { to: [3, 5], special: 'jump' });       // two steps would cost 6 > 5
  assert.deepEqual(cell(4, 6), { to: [4, 6], special: 'diagonal' });
});
