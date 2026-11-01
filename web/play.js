// Game flow without the DOM: what a click does and what the player is told. Every refused action
// says why, so the game never looks unresponsive.
import { PIECES, MOVE_LIMIT, newGame, actionsFor, applyAction } from './rules.js';

/** Color word for each side. */
export const TEAM = { red: 'rouge', blue: 'bleu' };
const PLAYER = { red: 'joueur 1 (rouge)', blue: 'joueur 2 (bleu)' };
const FEMININE = { explorer: false, vanguard: true, sentinel: true };

/** Board square as players read it: column letter, row number counted from the bottom (1..10). */
export const square = (r, c) => 'abcdefghij'[c - 1] + (11 - r);

const color = (p) => (p.team === 'blue' && FEMININE[p.type] ? 'bleue' : TEAM[p.team]);
const label = (p) => `${PIECES[p.type].name} ${color(p)}`;
const yourTurn = (team) => `Au tour du ${PLAYER[team]} : sélectionnez une pièce ${TEAM[team]}${team === 'blue' ? 'e' : ''}.`;

/**
 * Fresh game on a dealt board, with the UI fields (selection, message).
 * @param {number[][]} board @param {string} modeName terrain mode shown in the announcement
 */
export function newGameState(board, modeName) {
  return { ...newGame(board), selected: null,
    message: `Nouvelle partie : ${modeName}. Le ${PLAYER.red} commence : sélectionnez une pièce rouge.` };
}

const selectedPiece = (state) => state.pieces.find((p) => p.id === state.selected);

/** What to draw for the selection: reachable cells, allowed attacks, and whether it can exit. */
export function highlights(state) {
  const sel = selectedPiece(state);
  if (!sel) return { moves: [], attacks: [], canExit: false };
  const acts = actionsFor(state, sel);
  return {
    // An explorer can reach a cell both normally and with a special move: draw it once.
    moves: [...new Map(acts.filter((a) => a.kind === 'move').map((a) => [a.to.join(), a.to])).values()],
    attacks: acts.filter((a) => a.kind === 'attack' && a.allowed).map((a) => a.to),
    canExit: acts.some((a) => a.kind === 'exit'),
  };
}

function endMessage(s) {
  const who = s.winner === 'draw' ? 'match nul' : `victoire du ${PLAYER[s.winner]}`;
  const score = `${s.scores.red} à ${s.scores.blue}`;
  if (s.reason === 'sentinel') return `${label(s.exited[0])} arrive la première : ${who} !`;
  if (s.reason === 'exits') return `Deux pièces sont arrivées. Score ${score} : ${who} !`;
  if (s.reason === 'limit') return `${MOVE_LIMIT} coups atteints. Score ${score} : ${who} !`;
  return `Plus personne ne peut jouer. Score ${score} : ${who} !`;
}

// Plays `action` for `piece` and describes it.
function play(state, piece, action) {
  const target = action.kind === 'attack' && state.pieces.find((p) => p.id === action.targetId);
  const s = applyAction(state, piece.id, action);
  const what = action.kind === 'exit'
    ? `${label(piece)} franchit l'arrivée : +${PIECES[piece.type].strength}.`
    : target
      ? `${label(piece)} capture ${label(target)} (${action.attack} contre ${action.defense}).`
      : `${label(piece)} ${square(piece.r, piece.c)} → ${square(...action.to)}.`;
  const then = s.winner ? endMessage(s)
    : s.passed ? `Le ${PLAYER[s.passed]} ne peut pas jouer et passe son tour. ${yourTurn(s.turn)}`
      : `Au tour du ${PLAYER[s.turn]}.`;
  return { ...s, selected: null, message: `${what} ${then}` };
}

/** New state after the player clicks cell (r, c). Returns the same object once the game is over. */
export function handleClick(state, r, c) {
  if (state.winner) return state;
  const sel = selectedPiece(state);
  const here = state.pieces.find((p) => p.r === r && p.c === c);

  if (sel && !(here && here.team === state.turn)) {
    const acts = actionsFor(state, sel).filter((a) => a.to && a.to[0] === r && a.to[1] === c);
    const attack = acts.find((a) => a.kind === 'attack' && a.allowed) || acts.find((a) => a.kind === 'attack');
    const move = acts.find((a) => a.kind === 'move' && !a.special) || acts.find((a) => a.kind === 'move');
    if (attack && !attack.allowed)
      return { ...state, message: `Attaque impossible : force ${attack.attack} contre ${attack.defense}. Il faut au moins autant que le défenseur.` };
    if (attack || move) return play(state, sel, attack || move);
    return { ...state, message: 'Cette case est hors de portée : cliquez une case jaune (déplacement) ou rouge (attaque).' };
  }
  if (!here || here.team !== state.turn || here.id === state.selected)
    return { ...state, selected: null, message: yourTurn(state.turn) };

  const { move, strength, name } = PIECES[here.type];
  const acts = actionsFor(state, here).filter((a) => a.kind !== 'attack' || a.allowed);
  if (!acts.length) {
    const f = FEMININE[here.type];
    return { ...state, selected: null, message: `${f ? 'Cette' : 'Cet'} ${name} est bloqué${f ? 'e' : ''} : choisissez une autre pièce.` };
  }
  const exit = acts.some((a) => a.kind === 'exit') ? ', ou « Franchir l\'arrivée »' : '';
  return { ...state, selected: here.id,
    message: `${name} (Mouvement ${move}, Force ${strength}) : case jaune pour se déplacer, rouge pour attaquer${exit}.` };
}

/** The selected piece leaves the board past the finish line, if it can. */
export function handleExit(state) {
  const sel = selectedPiece(state);
  if (state.winner || !sel) return state;
  const exit = actionsFor(state, sel).find((a) => a.kind === 'exit');
  if (!exit) return { ...state, message: `${label(sel)} ne peut pas franchir l'arrivée d'ici.` };
  return play(state, sel, exit);
}
