import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIECES, stepCost, initialPieces, actionsFor, newGame, applyAction, limitResult, MOVE_LIMIT, pathTo,
} from '../rules.js';

const flat = () => Array.from({ length: 12 }, () => Array(12).fill(0));
const P = (id, type, team, r, c) => ({ id, type, team, r, c });
const game = (board, pieces, extra = {}) => ({ ...newGame(board), pieces, ...extra });
const at = (a, r, c) => a.to && a.to[0] === r && a.to[1] === c;
const find = (acts, kind, r, c) => acts.find((a) => a.kind === kind && (r === undefined || at(a, r, c)));

test('pieces: movement + strength = 6', () => {
  assert.deepEqual(PIECES.explorer, { move: 5, strength: 1, name: 'Explorateur' });
  assert.deepEqual(PIECES.vanguard, { move: 4, strength: 2, name: 'Avant-garde' });
  assert.deepEqual(PIECES.sentinel, { move: 3, strength: 3, name: 'Sentinelle' });
});

test('step cost: flat 1, otherwise height difference + 1', () => {
  assert.equal(stepCost(2, 2), 1);
  assert.equal(stepCost(2, 4), 3);
  assert.equal(stepCost(4, 2), 3);
  assert.equal(stepCost(4, 3), 2);
});

test('setup: six pieces each, symmetric on the central columns, red at the bottom', () => {
  const ps = initialPieces();
  const row = (team) => ps.filter((p) => p.team === team).sort((a, b) => a.c - b.c);
  assert.deepEqual(row('red').map((p) => [p.type, p.r, p.c]), [
    ['sentinel', 10, 3], ['vanguard', 10, 4], ['explorer', 10, 5],
    ['explorer', 10, 6], ['vanguard', 10, 7], ['sentinel', 10, 8]]);
  assert.deepEqual(row('blue').map((p) => [p.type, p.r]), row('red').map((p) => [p.type, 1]));
  assert.equal(newGame(flat()).turn, 'red');
});

test('movement budget: a sentinel reaches 3 flat cells, not 4, and pays for slopes', () => {
  const s = P('s', 'sentinel', 'red', 8, 5);
  let acts = actionsFor(game(flat(), [s]), s);
  assert.ok(find(acts, 'move', 5, 5));
  assert.ok(!find(acts, 'move', 4, 5));
  const b = flat(); b[7][5] = 2;                       // climbing 0 -> 2 costs 3
  acts = actionsFor(game(b, [s]), s);
  assert.equal(find(acts, 'move', 7, 5).cost, 3);
  assert.ok(!find(acts, 'move', 6, 5) || find(acts, 'move', 6, 5).cost <= 3);
});

test('no passing through pieces, no move back onto the start cell', () => {
  const s = P('s', 'sentinel', 'red', 8, 1);
  const wall = [P('a', 'vanguard', 'red', 7, 1), P('b', 'vanguard', 'red', 8, 2)];
  const moves = actionsFor(game(flat(), [s, ...wall]), s).filter((a) => a.kind === 'move');
  assert.ok(moves.length > 0);
  assert.ok(moves.every((a) => a.to[0] > 8), 'only the way down is open');
  assert.ok(!moves.some((a) => at(a, 8, 1)));
});

test('explorer specials: one diagonal step or a 2-cell jump, whatever the height', () => {
  const b = flat(); b[7][6] = 2; b[6][5] = 2;
  const e = P('e', 'explorer', 'red', 8, 5);
  const acts = actionsFor(game(b, [e]), e);
  assert.ok(acts.some((a) => a.special === 'diagonal' && at(a, 7, 6)));
  assert.ok(acts.some((a) => a.special === 'jump' && at(a, 6, 5)));
  assert.ok(!acts.some((a) => a.special && at(a, 6, 6)));
  const v = P('v', 'vanguard', 'red', 8, 5);
  assert.ok(!actionsFor(game(b, [v]), v).some((a) => a.special));
});

test('rules example 1: hill advantage + vanguard vs reinforced vanguard, 3 >= 3', () => {
  const b = flat(); b[5][5] = 1;
  const red = P('rv', 'vanguard', 'red', 5, 5);
  const blue = [P('bv', 'vanguard', 'blue', 3, 5), P('bs', 'sentinel', 'blue', 3, 4)];
  const a = find(actionsFor(game(b, [red, ...blue]), red), 'attack', 3, 5);
  assert.deepEqual([a.attack, a.defense, a.allowed], [3, 3, true]);
});

test('rules example 2: explorer + adjacent allied vanguard vs sentinel, 3 >= 3', () => {
  const ps = [P('re', 'explorer', 'red', 3, 2), P('rv', 'vanguard', 'red', 4, 5), P('bs', 'sentinel', 'blue', 3, 5)];
  const a = find(actionsFor(game(flat(), ps), ps[0]), 'attack', 3, 5);
  assert.deepEqual([a.attack, a.defense, a.allowed], [3, 3, true]);
});

test('uphill attack is -1, and an attack weaker than the defense is not allowed', () => {
  const b = flat(); b[4][5] = 1;
  const red = P('rv', 'vanguard', 'red', 5, 5);
  const a = find(actionsFor(game(b, [red, P('bv', 'vanguard', 'blue', 4, 5)]), red), 'attack', 4, 5);
  assert.deepEqual([a.attack, a.defense, a.allowed], [1, 2, false]);
});

test('vanguard charge: +1 when the shortest path to the target costs exactly 4', () => {
  const red = P('rv', 'vanguard', 'red', 8, 5);
  const a = find(actionsFor(game(flat(), [red, P('bv', 'vanguard', 'blue', 4, 5)]), red), 'attack', 4, 5);
  assert.deepEqual([a.attack, a.charge], [3, true]);
  const near = find(actionsFor(game(flat(), [red, P('bv', 'vanguard', 'blue', 6, 5)]), red), 'attack', 6, 5);
  assert.deepEqual([near.attack, near.charge], [2, false]);
});

test('a capture removes the defender and the attacker takes its cell', () => {
  const ps = [P('re', 'explorer', 'red', 3, 2), P('rv', 'vanguard', 'red', 4, 5), P('bs', 'sentinel', 'blue', 3, 5),
    P('bx', 'explorer', 'blue', 9, 9)];
  const g = game(flat(), ps);
  const s = applyAction(g, 're', find(actionsFor(g, ps[0]), 'attack', 3, 5));
  assert.deepEqual(s.pieces.map((p) => [p.id, p.r, p.c]), [['re', 3, 5], ['rv', 4, 5], ['bx', 9, 9]]);
  assert.equal(s.turn, 'blue');
  assert.deepEqual(s.captured, { red: 1, blue: 0 });
});

test('exit: needs the last row with at least 1 movement left; scores the strength', () => {
  const v = P('rv', 'vanguard', 'red', 4, 5);                 // 3 to row 1, 1 left: can exit
  assert.ok(find(actionsFor(game(flat(), [v]), v), 'exit'));
  const far = P('rv', 'vanguard', 'red', 5, 5);               // 4 to row 1, 0 left: cannot
  assert.ok(!find(actionsFor(game(flat(), [far]), far), 'exit'));
  const g = game(flat(), [v, P('bv', 'vanguard', 'blue', 9, 9)]);
  const s = applyAction(g, 'rv', { kind: 'exit' });
  assert.deepEqual([s.scores.red, s.exited.length, s.pieces.length, s.winner], [2, 1, 1, null]);
});

test('a sentinel exiting first wins at once', () => {
  const s = P('rs', 'sentinel', 'red', 1, 5);
  const g = game(flat(), [s, P('bv', 'vanguard', 'blue', 9, 9)]);
  const after = applyAction(g, 'rs', { kind: 'exit' });
  assert.deepEqual([after.winner, after.reason], ['red', 'sentinel']);
});

test('the second exit ends the game: higher score wins, equal scores draw', () => {
  const g = game(flat(), [P('re', 'explorer', 'red', 1, 2), P('bv', 'vanguard', 'blue', 10, 9)],
    { exited: [{ id: 'x', team: 'red', type: 'vanguard' }], scores: { red: 2, blue: 0 }, turn: 'blue' });
  assert.equal(applyAction(g, 'bv', { kind: 'exit' }).winner, 'draw');
  assert.equal(applyAction({ ...g, turn: 'red' }, 're', { kind: 'exit' }).winner, 'red');
});

test('move limit: score first, then closest piece, then strongest, else draw', () => {
  assert.equal(MOVE_LIMIT, 200);
  const base = game(flat(), [], { moveCount: 200 });
  assert.equal(limitResult({ ...base, scores: { red: 0, blue: 1 } }), 'blue');
  assert.equal(limitResult({ ...base, pieces: [P('a', 'explorer', 'red', 3, 1), P('b', 'explorer', 'blue', 7, 1)] }), 'red');
  assert.equal(limitResult({ ...base, pieces: [P('a', 'explorer', 'red', 3, 1), P('b', 'sentinel', 'blue', 8, 1)] }), 'blue');
  assert.equal(limitResult({ ...base, pieces: [P('a', 'explorer', 'red', 3, 1), P('b', 'explorer', 'blue', 8, 1)] }), 'draw');
});

test('reaching the move limit ends the game', () => {
  const ps = [P('a', 'explorer', 'red', 5, 1), P('b', 'explorer', 'blue', 2, 1)];   // red 3 rows away, blue 8
  const g = game(flat(), ps, { moveCount: MOVE_LIMIT - 1 });
  const s = applyAction(g, 'a', find(actionsFor(g, ps[0]), 'move', 4, 1));
  assert.deepEqual([s.winner, s.reason], ['red', 'limit']);
});

test('a side with no legal action passes its turn', () => {
  const b = flat(); b[1][1] = -2;                          // blue sits in a hole: attacks out are uphill
  const blue = P('bs', 'sentinel', 'blue', 1, 1);
  const walls = [P('r1', 'vanguard', 'red', 1, 2), P('r2', 'vanguard', 'red', 2, 1), P('r3', 'vanguard', 'red', 2, 2)];
  const red = P('rm', 'explorer', 'red', 9, 9);
  const g = game(b, [blue, ...walls, red]);
  assert.equal(actionsFor(g, blue).filter((a) => a.kind !== 'attack' || a.allowed).length, 0);
  const s = applyAction(g, 'rm', find(actionsFor(g, red), 'move', 8, 9));
  assert.deepEqual([s.turn, s.passed], ['red', 'blue']);
});

test('exit is a step onto the cell just past the finish line, one per reachable column, with its cost', () => {
  const v = P('rv', 'vanguard', 'red', 2, 5);                  // red exits past row 1, into row 0
  const exits = actionsFor(game(flat(), [v]), v).filter((a) => a.kind === 'exit');
  assert.ok(exits.some((a) => a.to[0] === 0 && a.to[1] === 5 && a.cost === 2));
  assert.ok(exits.some((a) => a.to[0] === 0 && a.to[1] === 3 && a.cost === 4));   // 1 up + 2 left + exit
  assert.ok(!exits.some((a) => a.to[1] === 2));                                    // would cost 5 > 4
  const b = P('bv', 'vanguard', 'blue', 10, 5);                // blue exits past row 10, into row 11
  assert.ok(actionsFor(game(flat(), [b]), b).some((a) => a.kind === 'exit' && a.to[0] === 11 && a.to[1] === 5 && a.cost === 1));
});

test('pathTo gives the cells a piece walks through, for moves, attacks, specials and exits', () => {
  const b = flat(); b[4][5] = 2;                                // a hill straight ahead: go round it
  const v = P('rv', 'vanguard', 'red', 5, 5);
  const g = game(b, [v, P('bx', 'explorer', 'blue', 3, 5)]);
  const acts = actionsFor(g, v);
  const move = acts.find((a) => a.kind === 'move' && a.to[0] === 3 && a.to[1] === 4);
  const path = pathTo(g, v, move);
  assert.deepEqual(path[0], [5, 5]);
  assert.deepEqual(path.at(-1), [3, 4]);
  for (let i = 1; i < path.length; i++)
    assert.equal(Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][1] - path[i - 1][1]), 1, 'orthogonal steps');
  const attack = acts.find((a) => a.kind === 'attack');
  assert.deepEqual(pathTo(g, v, attack).at(-1), [3, 5]);
  const e = P('re', 'explorer', 'red', 8, 8);
  const ge = game(flat(), [e]);
  assert.deepEqual(pathTo(ge, e, { kind: 'move', to: [7, 9], special: 'diagonal' }), [[8, 8], [7, 9]]);
  const x = P('rx', 'vanguard', 'red', 1, 5);
  const gx = game(flat(), [x]);
  assert.deepEqual(pathTo(gx, x, actionsFor(gx, x).find((a) => a.kind === 'exit' && a.to[1] === 5)), [[1, 5], [0, 5]]);
});
