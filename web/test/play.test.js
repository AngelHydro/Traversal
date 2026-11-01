import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGameState, handleClick } from '../play.js';

const flat = () => Array.from({ length: 12 }, () => Array(12).fill(0));
const start = (board = flat()) => newGameState(board, 'Forêts moyennes');

test('new game is announced with the landscape and who starts', () => {
  assert.match(start().message, /Nouvelle partie : Forêts moyennes\. Les noirs commencent/);
});
test('clicking an opponent piece says whose turn it is', () => {
  const s = handleClick(start(), 10, 3);
  assert.equal(s.selected, null);
  assert.match(s.message, /Au tour des noirs : sélectionnez une pièce noire/);
});
test('clicking an empty cell with nothing selected explains what to do', () => {
  assert.match(handleClick(start(), 5, 5).message, /sélectionnez une pièce noire/);
});
test('selecting a piece says to pick a yellow cell', () => {
  const s = handleClick(start(), 1, 3);
  assert.equal(s.selected, 'black-2');
  assert.match(s.message, /case jaune/);
});
test('selecting a walled-in piece explains why it cannot move', () => {
  const b = flat(); b[2][3] = 2;               // cliff in front; sides are own pieces
  const s = handleClick(start(b), 1, 3);
  assert.equal(s.selected, null);
  assert.match(s.message, /est bloqué.*relief/);
});
test('a legal move plays, passes the turn and reports the move', () => {
  let s = handleClick(start(), 1, 3);
  s = handleClick(s, 2, 3);
  assert.equal(s.turn, 'red');
  assert.match(s.message, /garde noirs c1 → c2.*Au tour des rouges/);
});
test('a capture is counted', () => {
  let s = start();
  s = { ...s, pieces: [{ id: 'b', type: 'soldier', team: 'black', r: 5, c: 5 }, { id: 'r', type: 'medic', team: 'red', r: 5, c: 6 }, { id: 'r2', type: 'soldier', team: 'red', r: 9, c: 9 }] };
  s = handleClick(handleClick(s, 5, 5), 5, 6);
  assert.equal(s.captured.black, 1);
  assert.match(s.message, /capture un médecin/);
});
test('reaching the far row wins and further clicks do nothing', () => {
  let s = { ...start(), pieces: [{ id: 'b', type: 'soldier', team: 'black', r: 9, c: 5 }, { id: 'r', type: 'soldier', team: 'red', r: 2, c: 2 }] };
  s = handleClick(handleClick(s, 9, 5), 10, 5);
  assert.equal(s.winner, 'black');
  assert.equal(handleClick(s, 2, 2), s);
});
test('clicking an unreachable cell keeps the selection and says to pick a yellow cell', () => {
  let s = handleClick(start(), 1, 3);
  s = handleClick(s, 5, 5);
  assert.equal(s.selected, 'black-2');
  assert.match(s.message, /pas accessible.*case jaune/);
});
test('a board where black cannot move ends the game at once', () => {
  const b = flat(); for (let c = 1; c <= 10; c++) b[2][c] = 2;
  const s = start(b);
  assert.equal(s.winner, 'red');
  assert.match(s.message, /Noirs bloqués : victoire des rouges/);
});
test('the blocked-piece message is short enough for two lines on a phone', () => {
  const b = flat(); b[2][3] = 2;
  assert.ok(handleClick(start(b), 1, 3).message.length <= 90);
});
test('new-game messages fit two lines on a phone, even with the longest landscape name', () => {
  const stuck = flat(); for (let c = 1; c <= 10; c++) stuck[2][c] = 2;
  for (const b of [flat(), stuck]) assert.ok(newGameState(b, 'Montagnes et vallées').message.length <= 100);
});
