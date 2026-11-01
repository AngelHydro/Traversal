// Page wiring: landscape choice, clicks, and what the player is told.
import { LANDSCAPES, DEFAULT_LANDSCAPE, generateBoard } from './terrain.js';
import { dealBoard } from './rules.js';
import { newGameState, handleClick, targets, TEAM } from './play.js';
import { createScene } from './scene.js';

const $ = (id) => document.getElementById(id);

// Shown instead of a blank page when the game cannot start; the detail helps diagnose a browser.
function showError(message, e) {
  $('error').textContent = message + (e ? ` (détail : ${e.message || e})` : '');
  $('error').hidden = false;
}
const NO_WEBGL = "Impossible d'afficher le plateau : WebGL n'est pas disponible dans ce navigateur. "
  + "Activez l'accélération graphique (Edge : Paramètres › Système et performances › « Utiliser l'accélération graphique », "
  + "Chrome : Paramètres › Système), puis redémarrez le navigateur, ou essayez Firefox.";

const select = $('landscape');
for (const group of [...new Set(LANDSCAPES.map((l) => l.group))]) {
  const og = document.createElement('optgroup');
  og.label = group;
  for (const l of LANDSCAPES.filter((x) => x.group === group)) og.append(new Option(l.name, l.id));
  select.append(og);
}
select.value = String(DEFAULT_LANDSCAPE);

let view;
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

// Errors in event handlers are shown too, so the game never silently stops responding.
const guarded = (fn) => (...args) => {
  try { fn(...args); } catch (e) { showError('Une erreur est survenue.', e); throw e; }
};

try {
  view = createScene($('view'));
  // The GPU can drop the context (driver reset, too many tabs): say so, and clear it once restored.
  $('view').addEventListener('webglcontextlost', () =>
    showError('Le rendu 3D a été interrompu par le navigateur. Rechargez la page si le plateau ne revient pas.'), true);
  $('view').addEventListener('webglcontextrestored', () => { $('error').hidden = true; }, true);
  view.onCellClick(guarded((r, c) => {
    state = handleClick(state, r, c);
    render();
  }));
  $('new').addEventListener('click', guarded(newGame));
  select.addEventListener('change', guarded(newGame));
  newGame();
} catch (e) {
  showError(/WebGL/i.test(String(e && e.message)) ? NO_WEBGL : 'Impossible de démarrer le jeu.', e);
  throw e;
}
