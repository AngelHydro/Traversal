// Page wiring: landscape choice, turn loop, captures, win.
import { LANDSCAPES, generateBoard } from './terrain.js';
import { initialPieces, legalMoves, movePiece, winner, other } from './rules.js';
import { createScene } from './scene.js';

const TEAM = { black: 'noirs', red: 'rouges' };
const $ = (id) => document.getElementById(id);

const select = $('landscape');
for (const group of [...new Set(LANDSCAPES.map((l) => l.group))]) {
  const og = document.createElement('optgroup');
  og.label = group;
  for (const l of LANDSCAPES.filter((x) => x.group === group)) og.append(new Option(l.name, l.id));
  select.append(og);
}
select.value = '5';

const view = createScene($('view'));
let state;

function render() {
  const sel = state.pieces.find((p) => p.id === state.selected);
  view.setPieces(state.pieces, state.selected);
  view.setHighlights(sel ? legalMoves(state.board, state.pieces, sel) : []);
  $('status').textContent = state.winner ? `Victoire des ${TEAM[state.winner]} !` : `Au tour des ${TEAM[state.turn]}`;
  $('status').className = state.winner ? 'win' : '';
  $('captures').textContent = `Captures — noirs : ${state.captured.black}, rouges : ${state.captured.red}`;
}

function newGame() {
  const board = generateBoard(Number(select.value));
  state = { board, pieces: initialPieces(), turn: 'black', selected: null, winner: null, captured: { black: 0, red: 0 } };
  // A team may be walled in from the start; that is a loss for the side to move, as in play.
  state.winner = winner(board, state.pieces, 'black');
  view.setBoard(board);
  render();
}

view.onCellClick((r, c) => {
  if (state.winner) return;
  const sel = state.pieces.find((p) => p.id === state.selected);
  if (sel && legalMoves(state.board, state.pieces, sel).some(([mr, mc]) => mr === r && mc === c)) {
    const before = state.pieces.length;
    state.pieces = movePiece(state.pieces, sel.id, r, c);
    if (state.pieces.length < before) state.captured[state.turn]++;
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
