// Page wiring: landscape choice, clicks, and what the player is told.
import { LANDSCAPES, DEFAULT_LANDSCAPE, generateBoard } from './terrain.js';
import { dealBoard } from './rules.js';
import { newGameState, handleClick, targets } from './play.js';
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
select.value = String(DEFAULT_LANDSCAPE);

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
  view.setPieces(state.pieces, state.selected);
  view.setHighlights(targets(state));
  $('status').textContent = state.winner ? `Victoire des ${TEAM[state.winner]} !` : `Au tour des ${TEAM[state.turn]}`;
  $('status').className = state.winner ? 'win' : state.turn;
  $('last').textContent = state.message;
  $('captures').textContent = `Captures — noirs : ${state.captured.black}, rouges : ${state.captured.red}`;
}

function newGame() {
  const id = Number(select.value);
  const board = dealBoard(() => generateBoard(id));
  state = newGameState(board, LANDSCAPES.find((l) => l.id === id).name);
  view.setBoard(board);
  render();
}

view.onCellClick((r, c) => {
  state = handleClick(state, r, c);
  render();
});

$('new').addEventListener('click', newGame);
select.addEventListener('change', newGame);
newGame();
