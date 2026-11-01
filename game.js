// Traversal — logique du jeu (sans affichage). Fonctionne dans le navigateur et sous Node.
(function (root) {
  'use strict';

  const N = 10; // plateau jouable 10x10
  const P = N + 2; // + un anneau de bordure à hauteur 0

  // Générateur pseudo-aléatoire à graine (mulberry32) : un même code = un même plateau.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const grid = (v) => Array.from({ length: P }, () => Array(P).fill(v));

  // Bornes physiques : chaque anneau vers le centre peut descendre/monter de 2 de plus.
  const MIN = grid(0);
  const MAX = grid(0);
  for (let k = 1; k <= 5; k++)
    for (let i = k; i < P - k; i++)
      for (let j = k; j < P - k; j++) {
        MIN[i][j] -= 2;
        MAX[i][j] += 2;
      }

  function violates(b, i, j) {
    const h = b[i][j];
    return (
      Math.abs(h - b[i - 1][j]) > 2 ||
      Math.abs(h - b[i + 1][j]) > 2 ||
      Math.abs(h - b[i][j - 1]) > 2 ||
      Math.abs(h - b[i][j + 1]) > 2 ||
      h > MAX[i][j] ||
      h < MIN[i][j]
    );
  }

  // Pousse des blocs au hasard dans la zone [lo, hi[ ; dir(i, j) renvoie +1 ou -1.
  function push(b, rand, count, lo, hi, dir) {
    let moves = 0;
    let strikes = 0;
    while (moves < count && strikes < 1e5) {
      const i = lo + Math.floor(rand() * (hi - lo));
      const j = lo + Math.floor(rand() * (hi - lo));
      const d = dir(i, j);
      b[i][j] += d;
      if (violates(b, i, j)) {
        b[i][j] -= d;
        strikes++;
      } else {
        moves++;
        strikes = 0;
      }
    }
  }

  // Facteur bas = surtout des montées (montagnes), facteur haut = surtout des descentes (vallées).
  function scramble(b, rand, factor) {
    const dir = () => (rand() >= factor ? 1 : -1);
    for (let k = 1; k <= 4; k++) push(b, rand, 150, k, P - k, dir);
  }

  // Une moitié du plateau monte, l'autre descend (coupe diagonale ou verticale, sens aléatoire).
  function mix(b, rand) {
    const diagonal = rand() >= 0.5;
    const flip = rand() >= 0.5;
    const up = (i, j) => {
      if (flip) [i, j] = [P - 1 - i, P - 1 - j];
      return diagonal ? j > i : j <= 5;
    };
    push(b, rand, 250, 1, P - 1, (i, j) => (up(i, j) ? 1 : -1));
  }

  const TERRAINS = [
    { id: 'mountains-high', group: 'Montagnes', name: 'Montagnes hautes', factor: 0.15 },
    { id: 'mountains-mid', group: 'Montagnes', name: 'Montagnes moyennes', factor: 0.225 },
    { id: 'mountains-low', group: 'Montagnes', name: 'Montagnes basses', factor: 0.3 },
    { id: 'woodland-high', group: 'Forêts', name: 'Forêts hautes', factor: 0.4 },
    { id: 'woodland-mid', group: 'Forêts', name: 'Forêts moyennes', factor: 0.5 },
    { id: 'woodland-low', group: 'Forêts', name: 'Forêts basses', factor: 0.6 },
    { id: 'valleys-high', group: 'Vallées', name: 'Vallées hautes', factor: 0.7 },
    { id: 'valleys-mid', group: 'Vallées', name: 'Vallées moyennes', factor: 0.775 },
    { id: 'valleys-low', group: 'Vallées', name: 'Vallées basses', factor: 0.85 },
    { id: 'everest', group: 'Terrains spéciaux', name: 'Mont Everest', fixed: MAX },
    { id: 'gasherbrum', group: 'Terrains spéciaux', name: 'Gasherbrum I', factor: 0.1 },
    { id: 'mixed', group: 'Terrains spéciaux', name: 'Montagnes et vallées', mix: true },
    { id: 'kuril', group: 'Terrains spéciaux', name: 'Fosse des Kouriles', factor: 0.9 },
    { id: 'mariana', group: 'Terrains spéciaux', name: 'Fosse des Mariannes', fixed: MIN },
  ];

  function checkBoard(b) {
    for (let i = 1; i <= N; i++) for (let j = 1; j <= N; j++) if (violates(b, i, j)) return false;
    return true;
  }

  // Renvoie les hauteurs 10x10 (sans la bordure).
  function generateBoard(terrainId, seed) {
    const t = TERRAINS.find((x) => x.id === terrainId);
    if (!t) throw new Error('Terrain inconnu : ' + terrainId);
    const rand = rng(seed);
    const b = t.fixed ? t.fixed.map((row) => row.slice()) : grid(0);
    if (t.mix) mix(b, rand);
    else if (!t.fixed) scramble(b, rand, t.factor);
    if (!checkBoard(b)) throw new Error('Plateau invalide généré'); // impossible : chaque poussée est vérifiée
    return b.slice(1, N + 1).map((row) => row.slice(1, N + 1));
  }

  const LINEUP = ['soldier', 'soldier', 'guard', 'medic', 'soldier', 'soldier'];

  // Joueur 0 (Noirs) en bas, joueur 1 (Rouges) en haut ; les Noirs commencent.
  // Si un camp n'a aucun coup au départ (~0,1 % des plateaux), on passe à la graine suivante.
  function newGame(terrainId, seed) {
    const pieces = [];
    LINEUP.forEach((type, k) => {
      pieces.push({ id: 'n' + k, type, owner: 0, r: N - 1, c: k + 2 });
      pieces.push({ id: 'r' + k, type, owner: 1, r: 0, c: k + 2 });
    });
    for (let tries = 0; ; tries++, seed = (seed + 1) >>> 0) {
      const s = { terrainId, seed, heights: generateBoard(terrainId, seed), pieces, turn: 0, winner: null, reason: null, history: [] };
      if ((hasMoves(s, 0) && hasMoves(s, 1)) || tries >= 50) return s;
    }
  }

  const pieceAt = (s, r, c) => s.pieces.find((p) => p.r === r && p.c === c) || null;

  // Une case orthogonale ; on peut monter d'au plus 1 et descendre d'au plus 2.
  function legalMoves(s, pieceId) {
    const p = s.pieces.find((x) => x.id === pieceId);
    if (!p || s.winner !== null || p.owner !== s.turn) return [];
    const out = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = p.r + dr;
      const c = p.c + dc;
      if (r < 0 || r >= N || c < 0 || c >= N) continue;
      const dh = s.heights[r][c] - s.heights[p.r][p.c];
      if (dh > 1 || dh < -2) continue;
      const q = pieceAt(s, r, c);
      if (q && q.owner === p.owner) continue;
      out.push({ r, c, capture: !!q });
    }
    return out;
  }

  const hasMoves = (s, owner) =>
    s.pieces.some((p) => p.owner === owner && legalMoves({ ...s, turn: owner }, p.id).length > 0);

  const square = (r, c) => 'abcdefghij'[c] + (N - r);

  // Renvoie un nouvel état ; lève une erreur si le coup est illégal.
  function applyMove(s, pieceId, r, c) {
    const move = legalMoves(s, pieceId).find((m) => m.r === r && m.c === c);
    if (!move) throw new Error('Coup illégal');
    const p = s.pieces.find((x) => x.id === pieceId);
    const pieces = s.pieces
      .filter((q) => !(q.r === r && q.c === c))
      .map((q) => (q.id === pieceId ? { ...q, r, c } : q));
    const next = {
      ...s,
      pieces,
      turn: 1 - s.turn,
      history: s.history.concat(square(p.r, p.c) + (move.capture ? 'x' : '-') + square(r, c)),
    };
    const opp = next.turn;
    if (!pieces.some((q) => q.owner === opp)) return { ...next, winner: s.turn, reason: 'capture' };
    if (!hasMoves(next, opp)) return { ...next, winner: s.turn, reason: 'blocked' };
    return next;
  }

  function endGame(s, winner, reason) {
    return s.winner !== null ? s : { ...s, winner, reason };
  }

  const api = { N, TERRAINS, rng, generateBoard, newGame, legalMoves, applyMove, endGame, pieceAt, square, MIN, MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Traversal = api;
})(this);
