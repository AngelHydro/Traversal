// Pieces and rules. Movement from game.py: one orthogonal step to a cell at the same height,
// one unit higher, or one to two units lower. All piece types move the same way.
// Capture by moving onto an enemy; win by reaching the enemy's back row; no legal move = loss.

const LINEUP = ['soldier', 'soldier', 'guard', 'soldier', 'medic', 'medic', 'soldier', 'guard', 'soldier', 'soldier'];
const HOME_ROW = { black: 1, red: 10 };
const GOAL_ROW = { black: 10, red: 1 };
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export const other = (team) => (team === 'black' ? 'red' : 'black');

export function initialPieces() {
  return ['black', 'red'].flatMap((team) =>
    LINEUP.map((type, k) => ({ id: `${team}-${k}`, type, team, r: HOME_ROW[team], c: k + 1 })));
}

export function canStep(fromH, toH) {
  const d = toH - fromH;
  return d <= 1 && d >= -2;
}

export function legalMoves(board, pieces, piece) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    const r = piece.r + dr, c = piece.c + dc;
    if (r < 1 || r > 10 || c < 1 || c > 10) continue;
    if (!canStep(board[piece.r][piece.c], board[r][c])) continue;
    if (pieces.some((q) => q.r === r && q.c === c && q.team === piece.team)) continue;
    out.push([r, c]);
  }
  return out;
}

export function movePiece(pieces, id, r, c) {
  return pieces
    .filter((q) => q.id === id || q.r !== r || q.c !== c)
    .map((q) => (q.id === id ? { ...q, r, c } : q));
}

export function winner(board, pieces, toMove) {
  for (const team of ['black', 'red'])
    if (pieces.some((q) => q.team === team && q.r === GOAL_ROW[team])) return team;
  const canMove = pieces.some((q) => q.team === toMove && legalMoves(board, pieces, q).length > 0);
  return canMove ? null : other(toMove);
}

// Draws boards until both sides have a legal move from the start, so no side is walled in from move one.
export function dealBoard(generate, tries = 50) {
  const pieces = initialPieces();
  const stuck = (b) => winner(b, pieces, 'black') || winner(b, pieces, 'red');
  let board = generate();
  for (let k = 1; k < tries && stuck(board); k++) board = generate();
  return board;
}
