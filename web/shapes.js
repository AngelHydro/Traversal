// Piece shapes, without Three.js: plain geometric solids named by the rule sheet. As the sheet says, the
// base has as many sides as the piece's Movement, so from above each piece has its own outline.
// frustum: `sides`-sided, radii `bottom`/`top` (equal = a straight prism), `height`;
// prism: a side `profile` [[x, y], ...] (y up from the cell's top face) extruded over `depth`, then turned
// by `turn` radians around the vertical axis.

export const SHAPES = {
  // Explorateur: cône pentagonal (pentagon base, Movement 5).
  explorer: { kind: 'frustum', sides: 5, bottom: 0.3, top: 0.17, height: 0.5 },
  // Avant-garde: coin en losange (a wedge on a diamond base, Movement 4).
  vanguard: { kind: 'prism', profile: [[-0.22, 0], [0.22, 0], [0.22, 0.28], [0.06, 0.46], [-0.22, 0.46]], depth: 0.44, turn: Math.PI / 4 },
  // Sentinelle: prisme triangulaire, standing (triangle base, Movement 3).
  sentinel: { kind: 'frustum', sides: 3, bottom: 0.34, top: 0.34, height: 0.5 },
};

/** Number of sides of a shape's base. */
export const baseSides = (s) => (s.kind === 'frustum' ? s.sides : 4);

/** Rotation around the vertical axis so a team's pieces face their direction of travel. */
export const facing = (team) => (team === 'red' ? 0 : Math.PI);
