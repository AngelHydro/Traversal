// Three.js rendering of the board and pieces. Cell (r, c) is centred at x = c - 5.5, z = r - 5.5.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { colorForHeight } from './terrain.js';
import { pickCell, createClickTracker } from './pick.js';
import { HEIGHT_UNIT, FLOOR, boardSphere, fitCamera } from './camera.js';

const PIECE_H = 0.25;
const LIFT = 0.15; // selected piece is raised by this much
const TEAM_COLOR = { black: 0x111111, red: 0xcc0000 };
const CLICK_SLOP = 5; // px: a drag longer than this rotates the camera, it does not click

const top = (h) => h * HEIGHT_UNIT;
const cx = (c) => c - 5.5;
const cz = (r) => r - 5.5;

// Flat bars for a piece, in cell-local coordinates: [dr, dc, lenR, lenC] (centre offset + size).
// Silhouettes from game.py: soldier = sword (391), medic = plus (494).
const BARS = {
  soldier: [[0, 0, 0.8, 0.1], [0.15, 0, 0.1, 0.5]],
  medic: [[0, 0, 0.8, 0.2], [0, 0, 0.2, 0.8]],
};
// Guard = pentagonal shield (game.py 452), points as [dr, dc].
const SHIELD = [[-0.375, -0.25], [-0.375, 0.25], [0.125, 0.25], [0.375, 0], [0.125, -0.25]];

// Materials are few and shared for the page's lifetime; only geometries are disposed.
const materials = new Map();
const mat = (key, make) => materials.get(key) || materials.set(key, make()).get(key);
const solid = (color) => mat(color, () => new THREE.MeshStandardMaterial({ color }));
const EDGE = () => mat('edge', () => new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
const TARGET = () => mat('target', () => new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.6 }));

function pieceMesh(piece) {
  const m = solid(TEAM_COLOR[piece.team]);
  const g = new THREE.Group();
  if (piece.type === 'guard') {
    const shape = new THREE.Shape(SHIELD.map(([dr, dc]) => new THREE.Vector2(dc, -dr)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: PIECE_H, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // extrusion now goes up, shape y (= -dr) maps to z = dr
    g.add(new THREE.Mesh(geo, m));
  } else {
    for (const [dr, dc, lr, lc] of BARS[piece.type]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(lc, PIECE_H, lr), m);
      bar.position.set(dc, PIECE_H / 2, dr);
      g.add(bar);
    }
  }
  return g;
}

const disposeGeometries = (o) => o.traverse((x) => x.geometry?.dispose());

/**
 * Mounts the 3D view in `container`. Throws when WebGL is unavailable.
 * @param {HTMLElement} container
 */
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe9f3);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(6, 12, 4);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 13, 13);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  const boardGroup = new THREE.Group();
  const pieceGroup = new THREE.Group();
  const highlightGroup = new THREE.Group();
  scene.add(boardGroup, pieceGroup, highlightGroup);

  let board = null;
  let sphere = null;

  // Frame the whole board, keeping the current viewing direction (the player may have rotated).
  function frame() {
    if (!sphere) return;
    const dir = camera.position.clone().sub(controls.target).toArray();
    const { position, target } = fitCamera(sphere.center, sphere.radius, camera.fov, camera.aspect, dir);
    camera.position.fromArray(position);
    controls.target.fromArray(target);
    controls.update();
  }
  let clickCb = () => {};
  const pieceMeshes = new Map(); // piece id -> Group, reused across moves

  const clear = (group) => {
    for (const o of [...group.children]) { group.remove(o); disposeGeometries(o); }
  };

  function setBoard(b) {
    board = b;
    clear(boardGroup);
    clear(pieceGroup);
    pieceMeshes.clear();
    for (let r = 1; r <= 10; r++)
      for (let c = 1; c <= 10; c++) {
        const h = top(b[r][c]) - FLOOR;
        const geo = new THREE.BoxGeometry(0.98, h, 0.98);
        const col = new THREE.Mesh(geo, solid(colorForHeight(b[r][c])));
        col.position.set(cx(c), FLOOR + h / 2, cz(r));
        col.userData = { kind: 'cell', r, c };
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), EDGE());
        edges.raycast = () => {}; // outlines are decoration: keep them out of click picking
        col.add(edges);
        boardGroup.add(col);
      }
    sphere = boardSphere(b);
    frame();
  }

  function setPieces(pieces, selectedId) {
    const alive = new Set(pieces.map((p) => p.id));
    for (const [id, g] of pieceMeshes)
      if (!alive.has(id)) { pieceGroup.remove(g); disposeGeometries(g); pieceMeshes.delete(id); }
    for (const p of pieces) {
      let g = pieceMeshes.get(p.id);
      if (!g) { g = pieceMesh(p); pieceMeshes.set(p.id, g); pieceGroup.add(g); }
      g.position.set(cx(p.c), top(board[p.r][p.c]) + (p.id === selectedId ? LIFT : 0), cz(p.r));
      g.traverse((x) => { x.userData = { kind: 'piece', selected: p.id === selectedId, r: p.r, c: p.c }; });
    }
  }

  function setHighlights(cells) {
    clear(highlightGroup);
    for (const [r, c] of cells) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), TARGET());
      plate.position.set(cx(c), top(board[r][c]) + 0.02, cz(r));
      plate.userData = { kind: 'target', r, c };
      highlightGroup.add(plate);
    }
  }

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
    const cell = pickCell(ray.intersectObjects([highlightGroup, pieceGroup, boardGroup], true));
    if (cell) clickCb(cell[0], cell[1]);
  });

  new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame();
  }).observe(container);

  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  return { setBoard, setPieces, setHighlights, onCellClick: (cb) => { clickCb = cb; } };
}
