// Page wiring: landscape choice, turn loop, captures, win.
import { LANDSCAPES, generateBoard } from './terrain.js';
import { initialPieces, legalMoves, movePiece, winner, other, dealBoard } from './rules.js';
import { createScene } from './scene.js';

const TEAM = { black: 'noirs', red: 'rouges' };
const PIECE = { soldier: 'soldat', guard: 'garde', medic: 'médecin' };
const square = (r, c) => 'abcdefghij'[c - 1] + r; // column letter + row number
const $ = (id) => document.getElementById(id);

const select = $('landscape');
for (const group of [...new Set(LANDSCAPES.map((l) => l.group))]) {
  const og = document.createElement('optgroup');
  og.label = group;
  for (const l of LANDSCAPES.filter((x) => x.group === group)) og.append(new Option(l.name, l.id));
  select.append(og);
}
select.value = '5';

let view;
try {
  view = createScene($('view'));
} catch (e) {
  $('error').textContent = "Impossible d'afficher le plateau : votre navigateur ne prend pas en charge WebGL.";
  $('error').hidden = false;
  throw e;
}
let state;

function render() {
  const sel = state.pieces.find((p) => p.id === state.selected);
  view.setPieces(state.pieces, state.selected);
  view.setHighlights(sel ? legalMoves(state.board, state.pieces, sel) : []);
  $('status').textContent = state.winner ? `Victoire des ${TEAM[state.winner]} !` : `Au tour des ${TEAM[state.turn]}`;
  $('status').className = state.winner ? 'win' : '';
  $('last').textContent = state.last;
  $('captures').textContent = `Captures — noirs : ${state.captured.black}, rouges : ${state.captured.red}`;
}

function newGame() {
  const board = dealBoard(() => generateBoard(Number(select.value)));
  state = { board, pieces: initialPieces(), turn: 'black', selected: null, winner: null, captured: { black: 0, red: 0 }, last: '' };
  view.setBoard(board);
  render();
}

view.onCellClick((r, c) => {
  if (state.winner) return;
  const sel = state.pieces.find((p) => p.id === state.selected);
  if (sel && legalMoves(state.board, state.pieces, sel).some(([mr, mc]) => mr === r && mc === c)) {
    const victim = state.pieces.find((q) => q.r === r && q.c === c);
    state.pieces = movePiece(state.pieces, sel.id, r, c);
    if (victim) state.captured[state.turn]++;
    state.last = `Dernier coup : ${PIECE[sel.type]} ${TEAM[sel.team]} ${square(sel.r, sel.c)} → ${square(r, c)}`
      + (victim ? `, capture un ${PIECE[victim.type]}` : '');
    state.turn = other(state.turn);
    state.selected = null;
    state.winner = winner(state.board, state.pieces, state.turn);
  } else {
    const p = state.pieces.find((q) => q.r === r && q.c === c && q.team === state.turn);
    state.selected = p && p.id !== state.selected ? p.id : null;
  }
  render();
});

$('new').addEventListener('click', newGame);
select.addEventListener('change', newGame);
newGame();
