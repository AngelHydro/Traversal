// node test.js
const assert = require('assert');
const T = require('./game.js');
const C = require('./clock.js');

// Plateaux : contraintes physiques respectées et génération reproductible.
for (const t of T.TERRAINS) {
  for (let seed = 1; seed <= 70; seed++) {
    const h = T.generateBoard(t.id, seed);
    assert.strictEqual(h.length, 10);
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const v = h[r][c];
        assert.ok(v >= T.MIN[r + 1][c + 1] && v <= T.MAX[r + 1][c + 1], t.id + ' bornes');
        const edge = (x) => (x === undefined ? 0 : x); // la bordure est à 0
        for (const n of [edge(h[r - 1] && h[r - 1][c]), edge(h[r + 1] && h[r + 1][c]), edge(h[r][c - 1]), edge(h[r][c + 1])])
          assert.ok(Math.abs(v - n) <= 2, t.id + ' voisinage');
      }
  }
}
assert.deepStrictEqual(T.generateBoard('woodland-mid', 42), T.generateBoard('woodland-mid', 42));
assert.notDeepStrictEqual(T.generateBoard('woodland-mid', 42), T.generateBoard('woodland-mid', 43));
assert.strictEqual(T.generateBoard('everest', 1)[4][4], 10);
assert.strictEqual(T.generateBoard('mariana', 1)[0][0], -2);

// Déplacements : montée max +1, descente max -2, pas sur ses propres pièces.
const flat = Array.from({ length: 10 }, () => Array(10).fill(0));
const state = (heights, pieces, turn = 0) => ({ heights, pieces, turn, winner: null, reason: null, history: [] });
let h = flat.map((r) => r.slice());
h[4][5] = 1; // haut : +1 ok
h[6][5] = -3; // bas : -3 interdit
h[5][4] = 2; // gauche : +2 interdit
let s = state(h, [
  { id: 'a', owner: 0, r: 5, c: 5 },
  { id: 'b', owner: 0, r: 5, c: 6 }, // droite : alliée
  { id: 'x', owner: 1, r: 0, c: 0 },
]);
assert.deepStrictEqual(T.legalMoves(s, 'a'), [{ r: 4, c: 5, capture: false }]);
assert.deepStrictEqual(T.legalMoves(s, 'x'), [], 'pas son tour');
h[6][5] = -2;
assert.strictEqual(T.legalMoves(s, 'a').length, 2, 'descente de 2 autorisée');
assert.throws(() => T.applyMove(s, 'a', 5, 4));

// Capture et victoire par élimination.
s = state(flat, [
  { id: 'a', owner: 0, r: 5, c: 5 },
  { id: 'x', owner: 1, r: 4, c: 5 },
]);
s = T.applyMove(s, 'a', 4, 5);
assert.strictEqual(s.pieces.length, 1);
assert.strictEqual(s.winner, 0);
assert.strictEqual(s.reason, 'capture');
assert.deepStrictEqual(s.history, ['f5xf6']);

// Victoire par blocage : l'adversaire n'a plus de coup légal.
h = flat.map((r) => r.slice());
h[0][1] = 5;
h[1][0] = 5;
s = state(h, [
  { id: 'a', owner: 0, r: 9, c: 9 },
  { id: 'x', owner: 1, r: 0, c: 0 },
]);
s = T.applyMove(s, 'a', 8, 9);
assert.strictEqual(s.winner, 0);
assert.strictEqual(s.reason, 'blocked');

// Partie normale : pas de fin immédiate.
s = T.newGame('woodland-mid', 7);
assert.strictEqual(s.pieces.length, 12);
assert.strictEqual(s.winner, null);

// Pendule avec une horloge simulée.
let now = 0;
const clock = C.createClock(60000, 2000, () => now);
clock.start(0);
now = 10000;
assert.strictEqual(clock.remaining(0), 50000);
clock.press(); // noirs jouent : +2 s
assert.strictEqual(clock.remaining(0), 52000);
assert.strictEqual(clock.active(), 1);
now = 15000;
assert.strictEqual(clock.remaining(1), 55000);
assert.strictEqual(clock.remaining(0), 52000, "la pendule de l'adversaire ne tourne pas");
clock.stop();
now = 99999;
assert.strictEqual(clock.remaining(1), 55000, 'arrêtée');
clock.start(1);
now += 60000;
assert.strictEqual(clock.flagged(), 1);
assert.strictEqual(clock.remaining(1), 0);
clock.press();
assert.strictEqual(clock.remaining(0), 52000, 'pas d’incrément après la chute');

// Cadences et affichage.
assert.deepStrictEqual(C.customControl('7', '4'), { group: 'Personnalisée', minutes: 7, increment: 4 });
assert.strictEqual(C.customControl(0, 5), null);
assert.strictEqual(C.customControl(200, 0), null);
assert.strictEqual(C.customControl(5, 1.5), null);
assert.strictEqual(C.customControl(5, -1), null);
assert.ok(C.PRESETS.some((p) => p.minutes === null));
assert.strictEqual(C.label({ minutes: 10, increment: 0 }), '10 | 0');
assert.strictEqual(C.formatTime(600000), '10:00');
assert.strictEqual(C.formatTime(3723000), '1:02:03');
assert.strictEqual(C.formatTime(19450), '19.4');
assert.strictEqual(C.formatTime(-5), '0.0');

console.log('OK : tous les tests passent');
