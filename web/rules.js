// Traversal rules (latest rule sheet). Pure functions, no DOM.
// Board: 12x12 heights with a 0 border; playable cells r, c in 1..10. Row 1 is the top of the screen.
// Player 1 (red) starts on row 10 (bottom) and exits past row 1; player 2 (blue) the opposite.

/** Piece types: movement + strength always add up to 6. */
export const PIECES = {
  explorer: { move: 5, strength: 1, name: 'Explorateur' },
  vanguard: { move: 4, strength: 2, name: 'Avant-garde' },
  sentinel: { move: 3, strength: 3, name: 'Sentinelle' },
};
/** A game stops after this many moves (one move = one player's turn). */
export const MOVE_LIMIT = 200;

const HOME = { red: 10, blue: 1 };
const GOAL = { red: 1, blue: 10 };
const LINEUP = ['sentinel', 'vanguard', 'explorer', 'explorer', 'vanguard', 'sentinel']; // columns 3..8
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const inside = (r, c) => r >= 1 && r <= 10 && c >= 1 && c <= 10;
const key = (r, c) => r * 16 + c;

/** @typedef {{id: string, type: 'explorer'|'vanguard'|'sentinel', team: 'red'|'blue', r: number, c: number}} Piece */

/** The opposing team. */
export const other = (team) => (team === 'red' ? 'blue' : 'red');

/** Movement cost of one orthogonal step: 1 on the flat, height difference + 1 otherwise. */
export const stepCost = (fromH, toH) => (fromH === toH ? 1 : Math.abs(toH - fromH) + 1);

/** Starting position: two of each type per side, symmetric on columns 3..8 of the home row. @returns {Piece[]} */
export function initialPieces() {
  return ['red', 'blue'].flatMap((team) =>
    LINEUP.map((type, k) => ({ id: `${team}-${k}`, type, team, r: HOME[team], c: k + 3 })));
}

/** Fresh game state on a board. Player 1 (red) moves first. */
export function newGame(board) {
  return {
    board, pieces: initialPieces(), turn: 'red', scores: { red: 0, blue: 0 }, captured: { red: 0, blue: 0 },
    exited: [], moveCount: 0, winner: null, reason: null, passed: null,
  };
}

// Cheapest orthogonal path cost from the piece to every empty cell (Dijkstra; grid is tiny).
function pathCosts(state, piece) {
  const { board, pieces } = state;
  const occupied = new Set(pieces.map((p) => key(p.r, p.c)));
  const cost = new Map([[key(piece.r, piece.c), 0]]);
  const open = [[0, piece.r, piece.c]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [d, r, c] = open.shift();
    if (d > cost.get(key(r, c))) continue;
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr, nc = c + dc;
      if (!inside(nr, nc) || occupied.has(key(nr, nc))) continue;
      const nd = d + stepCost(board[r][c], board[nr][nc]);
      if (nd < (cost.get(key(nr, nc)) ?? Infinity)) { cost.set(key(nr, nc), nd); open.push([nd, nr, nc]); }
    }
  }
  return cost; // includes the start cell at 0
}

/** Attack and defense strengths for `attacker` (standing at its start) hitting `target`. */
function combat(state, attacker, target, charge) {
  const { board, pieces } = state;
  const near = (p, q) => Math.abs(p.r - q.r) + Math.abs(p.c - q.c) === 1;
  const dh = board[attacker.r][attacker.c] - board[target.r][target.c];
  const allies = pieces.filter((p) => p.team === attacker.team && p.id !== attacker.id && near(p, target));
  const guards = pieces.filter((p) => p.team === target.team && p.id !== target.id && near(p, target));
  const attack = PIECES[attacker.type].strength + Math.sign(dh) + (charge ? 1 : 0)
    + allies.reduce((s, p) => s + PIECES[p.type].strength, 0);
  const defense = PIECES[target.type].strength + guards.length;
  return { attack, defense, allowed: attack >= defense };
}

/**
 * Every action available to `piece`: moves to empty cells, attacks on enemies (with their strengths and
 * whether they are allowed), explorer specials (diagonal step, 2-cell jump), and the exit.
 * A cell can appear twice for an explorer (normal and special); both are legal.
 * @returns {Array<{kind: 'move'|'attack'|'exit', to?: number[], cost?: number, special?: string,
 *   targetId?: string, attack?: number, defense?: number, allowed?: boolean, charge?: boolean}>}
 */
export function actionsFor(state, piece) {
  const { board, pieces } = state;
  const budget = PIECES[piece.type].move;
  const cost = pathCosts(state, piece);
  const at = new Map(pieces.map((p) => [key(p.r, p.c), p]));
  const out = [];

  for (const [k, d] of cost) {
    const r = Math.floor(k / 16), c = k % 16;
    if (d > 0 && d <= budget) out.push({ kind: 'move', to: [r, c], cost: d });
  }
  // Attacks: the last step enters the enemy's cell.
  for (const enemy of pieces.filter((p) => p.team !== piece.team)) {
    let best = Infinity;
    for (const [dr, dc] of ORTHO) {
      const fr = enemy.r + dr, fc = enemy.c + dc;
      const d = cost.get(key(fr, fc));
      if (d !== undefined) best = Math.min(best, d + stepCost(board[fr][fc], board[enemy.r][enemy.c]));
    }
    if (best <= budget) {
      const charge = piece.type === 'vanguard' && best === 4;
      out.push({ kind: 'attack', to: [enemy.r, enemy.c], cost: best, targetId: enemy.id, charge, ...combat(state, piece, enemy, charge) });
    }
  }
  // Explorer specials, from the starting cell, ignoring height.
  if (piece.type === 'explorer') {
    const specials = [...DIAG.map(([dr, dc]) => ['diagonal', dr, dc]), ...ORTHO.map(([dr, dc]) => ['jump', 2 * dr, 2 * dc])];
    for (const [special, dr, dc] of specials) {
      const r = piece.r + dr, c = piece.c + dc;
      if (!inside(r, c)) continue;
      const there = at.get(key(r, c));
      if (!there) out.push({ kind: 'move', to: [r, c], special });
      else if (there.team !== piece.team)
        out.push({ kind: 'attack', to: [r, c], special, targetId: there.id, charge: false, ...combat(state, piece, there, false) });
    }
  }
  // Exit: reach the goal row with at least 1 movement point left.
  for (const [k, d] of cost) if (Math.floor(k / 16) === GOAL[piece.team] && d <= budget - 1) { out.push({ kind: 'exit' }); break; }
  return out;
}

const canAct = (state, team) => state.pieces.some((p) => p.team === team
  && actionsFor(state, p).some((a) => a.kind !== 'attack' || a.allowed));

const byScore = (scores) => (scores.red === scores.blue ? 'draw' : scores.red > scores.blue ? 'red' : 'blue');

/** Winner when the game stops on the move limit (or when nobody can act). */
export function limitResult(state) {
  if (state.scores.red || state.scores.blue) return byScore(state.scores);
  const lead = (team) => {
    const left = (p) => Math.abs(p.r - GOAL[team]);
    const mine = state.pieces.filter((p) => p.team === team);
    if (!mine.length) return null;
    const rows = Math.min(...mine.map(left));
    return { rows, strength: Math.max(...mine.filter((p) => left(p) === rows).map((p) => PIECES[p.type].strength)) };
  };
  const red = lead('red'), blue = lead('blue');
  if (!red || !blue) return red ? 'red' : blue ? 'blue' : 'draw';
  if (red.rows !== blue.rows) return red.rows < blue.rows ? 'red' : 'blue';
  if (red.strength !== blue.strength) return red.strength > blue.strength ? 'red' : 'blue';
  return 'draw';
}

/**
 * State after the side to move plays `action` with piece `pieceId`. Handles captures, exits, scoring,
 * the sentinel's immediate win, the second exit, the move limit and passing when a side cannot act.
 */
export function applyAction(state, pieceId, action) {
  const piece = state.pieces.find((p) => p.id === pieceId);
  let { pieces, scores, captured, exited } = state;
  let winner = null, reason = null;

  if (action.kind === 'exit') {
    pieces = pieces.filter((p) => p.id !== pieceId);
    scores = { ...scores, [piece.team]: scores[piece.team] + PIECES[piece.type].strength };
    if (exited.length === 0 && piece.type === 'sentinel') { winner = piece.team; reason = 'sentinel'; }
    exited = [...exited, { id: piece.id, team: piece.team, type: piece.type }];
    if (!winner && exited.length >= 2) { winner = byScore(scores); reason = 'exits'; }
  } else {
    const [r, c] = action.to;
    if (action.kind === 'attack') captured = { ...captured, [piece.team]: captured[piece.team] + 1 };
    pieces = pieces.filter((p) => !(p.r === r && p.c === c)).map((p) => (p.id === pieceId ? { ...p, r, c } : p));
  }

  const next = { ...state, pieces, scores, captured, exited, moveCount: state.moveCount + 1, turn: other(state.turn), passed: null };
  if (winner) return { ...next, winner, reason };
  if (next.moveCount >= MOVE_LIMIT) return { ...next, winner: limitResult(next), reason: 'limit' };
  if (!canAct(next, next.turn)) {
    if (!canAct(next, state.turn)) return { ...next, winner: limitResult(next), reason: 'stuck' };
    return { ...next, turn: state.turn, passed: next.turn };
  }
  return next;
}

/** Draws boards until both sides can act from the start. @param {() => number[][]} generate */
export function dealBoard(generate, tries = 50) {
  let board = generate();
  for (let k = 1; k < tries; k++) {
    const g = newGame(board);
    if (canAct(g, 'red') && canAct(g, 'blue')) break;
    board = generate();
  }
  return board;
}
