// Page wiring: terrain mode, board number, clicks, exit button, and what the player is told.
import { MODES, DEFAULT_MODE, generateBoard, makeRng } from './terrain.js';
import { MOVE_LIMIT } from './rules.js';
import { newGameState, handleClick, handleExit, highlights, TEAM } from './play.js';
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
for (const m of MODES) {
  const o = new Option(m.name, m.id);
  o.title = m.hint;
  select.append(o);
}
// ?terrain=<mode>&plateau=<number> replays the same board (handy for a physical edition).
const params = new URLSearchParams(location.search);
select.value = MODES.some((m) => m.id === params.get('terrain')) ? params.get('terrain') : DEFAULT_MODE;
let seed = Number(params.get('plateau')) || null;

let view;
let state;

function render() {
  const hl = highlights(state);
  view.setPieces(state.pieces, state.selected, state.winner ? undefined : state.turn);
  view.setHighlights(hl.moves, hl.attacks);
  $('exit').hidden = !hl.canExit;
  $('status').textContent = state.winner
    ? (state.winner === 'draw' ? 'Match nul' : `Victoire du joueur ${state.winner === 'red' ? 1 : 2} (${TEAM[state.winner]})`)
    : `Au tour du joueur ${state.turn === 'red' ? 1 : 2} (${TEAM[state.turn]})`;
  $('status').className = state.winner ? 'win' : state.turn;
  $('last').textContent = state.message;
  $('score').textContent = `Score : rouge ${state.scores.red}, bleu ${state.scores.blue} · Arrivées ${state.exited.length}/2 · `
    + `Coup ${state.moveCount}/${MOVE_LIMIT} · Plateau n° ${state.seed}`;
}

function newGame() {
  const mode = MODES.find((m) => m.id === select.value);
  const boardSeed = seed || Math.floor(Math.random() * 1e6) + 1;
  seed = null; // only the first game uses the seed from the address
  const board = generateBoard(mode.id, makeRng(boardSeed));
  state = { ...newGameState(board, mode.name), seed: boardSeed };
  history.replaceState(null, '', `?terrain=${mode.id}&plateau=${boardSeed}`);
  view.setBoard(board);
  render();
}

// Errors in event handlers are shown too, so the game never silently stops responding.
const guarded = (fn) => (...args) => {
  try { fn(...args); } catch (e) { showError('Une erreur est survenue.', e); throw e; }
};

try {
  view = createScene($('view'));
  const LOST = 'Le rendu 3D a été interrompu par le navigateur. Rechargez la page si le plateau ne revient pas.';
  $('view').addEventListener('webglcontextlost', () => { if ($('error').hidden) showError(LOST); }, true);
  // Only clear our own banner: another error shown meanwhile must stay visible.
  $('view').addEventListener('webglcontextrestored', () => {
    if ($('error').textContent === LOST) $('error').hidden = true;
  }, true);
  view.onCellClick(guarded((r, c) => { state = handleClick(state, r, c); render(); }));
  $('exit').addEventListener('click', guarded(() => { state = handleExit(state); render(); }));
  $('new').addEventListener('click', guarded(newGame));
  select.addEventListener('change', guarded(newGame));
  newGame();
} catch (e) {
  showError(/WebGL/i.test(String(e && e.message)) ? NO_WEBGL : 'Impossible de démarrer le jeu.', e);
  throw e;
}
