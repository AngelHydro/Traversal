// Piece shapes, without Three.js: plain geometric solids named by the rule sheet.
// frustum: a pyramid cut flat at the top (`sides` sides, radii `bottom`/`top`, `height`);
// prism: a side `profile` [[x, y], ...] (y up from the cell's top face) extruded over `depth`.

export const SHAPES = {
  // Explorateur: cône pentagonal.
  explorer: { kind: 'frustum', sides: 5, bottom: 0.3, top: 0.17, height: 0.5 },
  // Avant-garde: coin (a block with one top corner cut away).
  vanguard: { kind: 'prism', profile: [[-0.28, 0], [0.28, 0], [0.28, 0.3], [0.1, 0.48], [-0.28, 0.48]], depth: 0.5 },
  // Sentinelle: prisme triangulaire.
  sentinel: { kind: 'prism', profile: [[-0.27, 0], [0.3, 0], [-0.12, 0.56]], depth: 0.5 },
};
