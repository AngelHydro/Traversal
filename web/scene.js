// Three.js rendering of the board and pieces. Cell (r, c) is centred at x = c - 5.5, z = r - 5.5.
// Rows 0 and 11 are the cells just past each finish line (where a piece exits).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { colorForHeight } from './terrain.js';
import { pickCell, createClickTracker } from './pick.js';
import { HEIGHT_UNIT, VIEW_DIR, MAX_POLAR, floorFor, boardBox, fitCamera, zoomLimits } from './camera.js';
import { pieceShape, spikePositions } from './shapes.js';

const LIFT = 0.15;   // selected piece is raised by this much
const TEAM_COLOR = { red: 0xd12a2a, blue: 0x2f62d8 };
const CLICK_SLOP = 5; // px: a drag longer than this rotates the camera, it does not click
const STEP_MS = 140;  // animation time per cell walked
const BACKGROUND = { light: 0xdfe9f3, dark: 0x15181d };

const top = (h) => h * HEIGHT_UNIT;
const cx = (c) => c - 5.5;
const cz = (r) => r - 5.5;
const noPick = (o) => { o.raycast = () => {}; return o; }; // decoration: never takes a click

// Materials are few and shared for the page's lifetime; only geometries are disposed.
const materials = new Map();
const mat = (key, make) => materials.get(key) || materials.set(key, make()).get(key);
const solid = (color) => mat(color, () => new THREE.MeshStandardMaterial({ color }));
const flat = (key, color, opacity) => mat(key, () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
const EDGE = () => mat('edge', () => new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
const NOTCH = () => mat('notch', () => new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
const PLATES = {
  move: () => flat('move', 0xffd700, 0.6),
  exit: () => flat('exit', 0xffd700, 0.6),
  special: () => flat('special', 0xb07cff, 0.6),
  attack: () => flat('attack', 0xff2d2d, 0.7),
  refused: () => flat('refused', 0x6b6b6b, 0.7),
};

// Small text drawn on a flat square (height numbers, costs) or a floating sprite (combat result).
const textures = new Map();
function textTexture(text, color = '#ffffff') {
  const k = text + color;
  if (!textures.has(k)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    g.font = 'bold 40px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(0,0,0,.65)';
    g.strokeText(text, 32, 34);
    g.fillStyle = color;
    g.fillText(text, 32, 34);
    textures.set(k, new THREE.CanvasTexture(canvas));
  }
  return textures.get(k);
}
function label(text, size, opacity = 0.9) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: textTexture(text), transparent: true, opacity, depthWrite: false }));
  m.material.userData.own = true;                 // not shared: disposed with the label (textures stay cached)
  m.rotation.x = -Math.PI / 2;
  return noPick(m);
}

// Pieces follow the rule sheet: a base with as many sides as the Movement, as many spikes as the Strength.
function pieceMesh(piece) {
  const { sides, spikes } = pieceShape(piece.type);
  const material = solid(TEAM_COLOR[piece.team]);
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.18, sides), material);
  base.position.y = 0.09;
  g.add(base);
  for (const [x, z] of spikePositions(spikes, spikes === 1 ? 0 : 0.15)) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.3, 8), material);
    spike.position.set(x, 0.18 + 0.15, z);
    g.add(spike);
  }
  return g;
}

// Horizontal notches on the four sides of a column, one per height unit, like the wooden board.
function notches(height, levels) {
  const pts = [];
  const s = 0.495;
  for (const y of levels) {
    const corners = [[-s, -s], [s, -s], [s, s], [-s, s], [-s, -s]];
    for (let i = 0; i < 4; i++) pts.push(corners[i][0], y, corners[i][1], corners[i + 1][0], y, corners[i + 1][1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.translate(0, -height / 2, 0);
  return noPick(new THREE.LineSegments(geo, NOTCH()));
}

// Frees geometries, and the materials that belong to one object only (labels); shared materials stay.
const disposeGeometries = (o) => o.traverse((x) => { x.geometry?.dispose(); if (x.material?.userData.own) x.material.dispose(); });

/**
 * Mounts the 3D view in `container`. Throws when WebGL is unavailable.
 * @param {HTMLElement} container
 */
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND.light);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(6, 12, 4);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(...VIEW_DIR);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = MAX_POLAR;
  controls.update();

  const boardGroup = new THREE.Group();
  const pieceGroup = new THREE.Group();
  const highlightGroup = new THREE.Group();
  const effectGroup = new THREE.Group();
  scene.add(boardGroup, pieceGroup, highlightGroup, effectGroup);

  let board = null;
  let currentTurn;
  let box = null;
  let animate = true;
  let clickCb = () => {};
  const pieceMeshes = new Map(); // piece id -> Group, reused across moves
  const moving = new Set();      // ids whose position a tween controls

  // Tweens: update(k) with k going 0 -> 1 over `ms`, then done().
  let tweens = [];
  function tween(ms, update, done = () => {}, delay = 0) {
    if (!animate) { update(1); done(); return null; }
    const t = { start: performance.now() + delay, ms, update, done };
    tweens.push(t);
    return t;
  }
  const cancel = (t) => { if (t) tweens = tweens.filter((x) => x !== t); };
  const walks = new Map();   // object -> its running walk tween (one walk at a time per object)
  let turning = null;        // the running camera turn
  let userMoved = false;     // the player has rotated or zoomed since the board was drawn
  controls.addEventListener('start', () => { userMoved = true; });
  function runTweens(now) {
    tweens = tweens.filter((t) => {
      if (now < t.start) return true;
      const k = Math.min(1, (now - t.start) / t.ms);
      t.update(k);
      if (k < 1) return true;
      t.done();
      return false;
    });
  }

  // Frame the whole board, keeping the current viewing direction, and limit the zoom around that view.
  // With move = false (window resized after the player rotated or zoomed) only the zoom limits follow:
  // the player's own view is kept, clamped into the new limits by the controls.
  function frame(move = true) {
    if (!box) return;
    const dir = camera.position.clone().sub(controls.target).toArray();
    const { position, target } = fitCamera(box.center, box.half, camera.fov, camera.aspect, dir);
    if (move) {
      camera.position.fromArray(position);
      controls.target.fromArray(target);
    }
    const { min, max } = zoomLimits(Math.hypot(...position.map((x, i) => x - target[i])));
    controls.minDistance = min;
    controls.maxDistance = max;
    controls.update();
  }

  const clear = (group) => {
    for (const o of [...group.children]) { group.remove(o); disposeGeometries(o); }
  };
  const groundY = (r, c) => top(board[Math.min(10, Math.max(1, r))][c]); // rows 0 / 11 sit at the edge row's height
  const at = (r, c, lift = 0) => new THREE.Vector3(cx(c), groundY(r, c) + lift, cz(r));

  /** Draws a new board (new game): resets pieces, animations and the camera framing. style: see restyle. */
  function setBoard(b, style) {
    board = b;
    tweens = [];
    walks.clear();
    turning = null;
    userMoved = false;
    moving.clear();
    for (const group of [pieceGroup, highlightGroup, effectGroup]) clear(group);
    pieceMeshes.clear();
    restyle(style);
    box = boardBox(b);
    frame();
  }

  /**
   * Redraws the terrain only (a setting changed): pieces, animations and the camera stay as they are.
   * style: { palette: 'soft'|'classic', heightMarks: 'notches'|'numbers' }
   */
  function restyle({ palette = 'soft', heightMarks = 'notches' } = {}) {
    const b = board;
    clear(boardGroup);
    const FLOOR = floorFor(b);
    for (let r = 1; r <= 10; r++)
      for (let c = 1; c <= 10; c++) {
        const h = top(b[r][c]) - FLOOR;
        const geo = new THREE.BoxGeometry(0.98, h, 0.98);
        const col = new THREE.Mesh(geo, solid(colorForHeight(b[r][c], palette)));
        col.position.set(cx(c), FLOOR + h / 2, cz(r));
        col.userData = { kind: 'cell', r, c };
        col.add(noPick(new THREE.LineSegments(new THREE.EdgesGeometry(geo), EDGE())));
        if (heightMarks === 'notches') {
          const levels = [];
          for (let u = Math.round(FLOOR / HEIGHT_UNIT) + 1; u < b[r][c]; u++) levels.push(top(u) - FLOOR);
          col.add(notches(h, levels));
        } else {
          const n = label(String(b[r][c]), 0.34, 0.85);
          // A corner of the top face (pieces stand in the middle), above the 0.04 highlight plates.
          n.position.set(-0.32, h / 2 + 0.045, 0.32);
          col.add(n);
        }
        boardGroup.add(col);
      }
    // Finish lines: red exits past the far edge (row 1), blue past the near edge (row 10).
    for (const [row, team, side] of [[1, 'red', -0.47], [10, 'blue', 0.47]])
      for (let c = 1; c <= 10; c++) {
        const strip = noPick(new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.03, 0.06), solid(TEAM_COLOR[team])));
        strip.position.set(cx(c), top(b[row][c]) + 0.016, cz(row) + side);
        boardGroup.add(strip);
      }
  }

  function setPieces(pieces, selectedId, turn) {
    currentTurn = turn;
    const alive = new Set(pieces.map((p) => p.id));
    for (const [id, g] of pieceMeshes)
      if (!alive.has(id)) { pieceGroup.remove(g); disposeGeometries(g); pieceMeshes.delete(id); }
    for (const p of pieces) {
      let g = pieceMeshes.get(p.id);
      if (!g) { g = pieceMesh(p); pieceMeshes.set(p.id, g); pieceGroup.add(g); }
      if (!moving.has(p.id)) g.position.copy(at(p.r, p.c, p.id === selectedId ? LIFT : 0));
      g.traverse((x) => { x.userData = { kind: 'piece', team: p.team, selected: p.id === selectedId, r: p.r, c: p.c }; });
    }
  }

  /**
   * Yellow plates: cells to move to and cells past the finish line; violet: cells only an explorer special
   * move reaches (diagonal step or jump, which ignore height); red: enemies that can be attacked;
   * grey: enemies in reach but too strong. options.showCosts writes the movement cost on yellow plates.
   */
  function setHighlights({ moves = [], attacks = [], refused = [], exits = [] }, { showCosts = true } = {}) {
    clear(highlightGroup);
    const plate = ([r, c], kind, cost) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), PLATES[kind]());
      p.position.copy(at(r, c, 0.02));
      p.userData = { kind: 'target', r, c };
      if (showCosts && cost !== undefined) {
        const l = label(String(cost), 0.3);
        l.position.y = 0.025;
        p.add(l);
      }
      highlightGroup.add(p);
    };
    for (const m of moves) plate(m.to, m.special ? 'special' : 'move', m.cost);
    for (const e of exits) plate(e.to, 'exit', e.cost);
    for (const a of attacks) plate(a, 'attack');
    for (const a of refused) plate(a, 'refused');
  }

  // A detached copy of a piece for effects (captures, exits): its own fading material.
  function ghost(id) {
    const g = pieceMeshes.get(id);
    if (!g) return null;
    pieceMeshes.delete(id);
    pieceGroup.remove(g);
    g.traverse((x) => { if (x.material) { x.material = x.material.clone(); x.material.transparent = true; } });
    effectGroup.add(g);
    return g;
  }
  const fade = (g, opacity) => g.traverse((x) => { if (x.material) x.material.opacity = opacity; });
  const dispose = (g) => { effectGroup.remove(g); g.traverse((x) => { x.geometry?.dispose(); x.material?.dispose(); }); };

  // The piece hops cell by cell along `path` ([[r, c], ...]); `then` runs when it arrives.
  // A new walk replaces a running one for the same object (its `then` is dropped with it).
  function walk(obj, path, then = () => {}) {
    const pts = path.map(([r, c]) => at(r, c));
    const ms = STEP_MS * Math.max(1, pts.length - 1);
    cancel(walks.get(obj));
    const t = tween(ms, (k) => {
      const f = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), s = f - i;
      if (pts.length < 2) return;
      obj.position.lerpVectors(pts[i], pts[i + 1], s);
      obj.position.y += Math.sin(Math.PI * s) * 0.18;
    }, () => { walks.delete(obj); then(); });
    if (t) walks.set(obj, t);
    return ms;
  }

  /**
   * Animates the move just played (play.js `state.last`), before the new position is drawn:
   * the piece walks its path; a captured piece sinks and fades under "attack contre defense";
   * an exiting piece walks past the finish line and rises away.
   */
  function playMove(last, combatText) {
    const { pieceId, action, path, targetId } = last;
    if (action.kind === 'exit') {
      const g = ghost(pieceId);
      if (g) walk(g, path, () => tween(500, (k) => { g.position.y += 0.03; fade(g, 1 - k); }, () => dispose(g)));
      return;
    }
    const g = pieceMeshes.get(pieceId);
    if (!g) return;
    moving.add(pieceId);
    const ms = walk(g, path, () => moving.delete(pieceId));
    if (targetId) {
      const victim = ghost(targetId);
      if (victim) {
        const y0 = victim.position.y;
        tween(500, (k) => { victim.position.y = y0 - 0.5 * k; fade(victim, 1 - k); }, () => dispose(victim), ms * 0.8);
      }
      if (combatText) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(combatText, '#ffe066'), transparent: true }));
        s.scale.set(1.4, 1.4, 1);
        const [r, c] = action.to;
        const p0 = at(r, c, 0.7);
        effectGroup.add(s);
        tween(900, (k) => { s.position.set(p0.x, p0.y + 0.6 * k, p0.z); s.material.opacity = 1 - k * k; },
          () => { effectGroup.remove(s); s.material.dispose(); }, ms * 0.8);
      }
    }
  }

  /** Turns the board so `team`'s side is in front (rotation around the board's centre). */
  function faceTeam(team) {
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const from = spherical.theta;                         // three.js azimuth: 0 = looking from +z (red side)
    const to = team === 'red' ? 0 : Math.PI;
    const delta = ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; // shortest turn
    cancel(turning);                                     // a new turn starts from where the last one stopped
    turning = null;
    if (Math.abs(delta) < 1e-3) return;
    turning = tween(700, (k) => {
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const s = spherical.clone();
      s.theta = from + delta * e;
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
      camera.lookAt(controls.target);
    });
  }

  /** Light or dark background. */
  function setTheme(dark) { scene.background = new THREE.Color(dark ? BACKGROUND.dark : BACKGROUND.light); }

  // Click picking: single-pointer taps only (drags rotate, pinches zoom).
  const ray = new THREE.Raycaster();
  const tracker = createClickTracker(CLICK_SLOP);
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => tracker.down(e));
  el.addEventListener('pointercancel', (e) => tracker.cancel(e));
  el.addEventListener('pointerup', (e) => {
    if (!tracker.up(e)) return;
    const rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const cell = pickCell(ray.intersectObjects([highlightGroup, pieceGroup, boardGroup], true), currentTurn);
    if (cell) clickCb(cell[0], cell[1]);
  });

  new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame(!userMoved);
  }).observe(container);

  renderer.setAnimationLoop((now) => { runTweens(now); controls.update(); renderer.render(scene, camera); });

  return {
    setBoard, restyle, setPieces, setHighlights, playMove, faceTeam, setTheme,
    setAnimations: (on) => { animate = on; },
    onCellClick: (cb) => { clickCb = cb; },
  };
}
