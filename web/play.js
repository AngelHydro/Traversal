// Game flow without the DOM: what a click does and what the player is told. Every refused action
// says why, so the game never looks unresponsive.
import { initialPieces, legalMoves, movePiece, winner, other } from './rules.js';

const TEAM = { black: 'noirs', red: 'rouges' };
const ONE = { black: 'pièce noire', red: 'pièce rouge' };
const PIECE = { soldier: 'soldat', guard: 'garde', medic: 'médecin' };
const square = (r, c) => 'abcdefghij'[c - 1] + r; // column letter + row number
const yourTurn = (team) => `Au tour des ${TEAM[team]} : sélectionnez une ${ONE[team]}.`;

/**
 * Fresh game state on a dealt board.
 * @param {number[][]} board @param {string} landscapeName shown in the announcement
 */
export function newGameState(board, landscapeName) {
  return {
    board, pieces: initialPieces(), turn: 'black', selected: null, winner: null,
    captured: { black: 0, red: 0 },
    message: `Nouvelle partie : ${landscapeName}. Les noirs commencent : sélectionnez une pièce noire.`,
  };
}

/** Cells the selected piece can move to (empty when nothing is selected). */
export function targets(state) {
  const sel = state.pieces.find((p) => p.id === state.selected);
  return sel ? legalMoves(state.board, state.pieces, sel) : [];
}

/**
 * New state after the player clicks cell (r, c). Returns the same object when the game is over.
 * @returns {object} state with an updated `message`
 */
export function handleClick(state, r, c) {
  if (state.winner) return state;
  const sel = state.pieces.find((p) => p.id === state.selected);

  if (sel && targets(state).some(([mr, mc]) => mr === r && mc === c)) {
    const victim = state.pieces.find((q) => q.r === r && q.c === c);
    const pieces = movePiece(state.pieces, sel.id, r, c);
    const turn = other(state.turn);
    const won = winner(state.board, pieces, turn);
    const move = `${PIECE[sel.type]} ${TEAM[sel.team]} ${square(sel.r, sel.c)} → ${square(r, c)}`
      + (victim ? `, capture un ${PIECE[victim.type]}` : '');
    return {
      ...state, pieces, turn, selected: null, winner: won,
      captured: victim ? { ...state.captured, [state.turn]: state.captured[state.turn] + 1 } : state.captured,
      message: `Dernier coup : ${move}. ` + (won ? `Victoire des ${TEAM[won]} !` : `Au tour des ${TEAM[turn]}.`),
    };
  }

  const here = state.pieces.find((q) => q.r === r && q.c === c);
  if (!here || here.team !== state.turn || here.id === state.selected)
    return { ...state, selected: null, message: yourTurn(state.turn) };

  const moves = legalMoves(state.board, state.pieces, here);
  if (moves.length === 0)
    return { ...state, selected: null,
      message: `Ce ${PIECE[here.type]} ne peut pas bouger : relief trop haut (on monte d'un niveau au plus) ou cases voisines occupées. Choisissez une autre pièce.` };
  return { ...state, selected: here.id, message: `${PIECE[here.type][0].toUpperCase()}${PIECE[here.type].slice(1)} sélectionné : cliquez une case jaune pour le déplacer.` };
}
