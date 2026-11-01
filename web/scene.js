// Three.js rendering of the board and pieces. Cell (r, c) is centred at x = c - 5.5, z = r - 5.5.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { colorForHeight } from './terrain.js';

const HEIGHT_UNIT = 0.5;
const FLOOR = -11 * HEIGHT_UNIT;
const PIECE_H = 0.25;
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

function pieceMesh(piece) {
  const mat = new THREE.MeshStandardMaterial({ color: TEAM_COLOR[piece.team] });
  const g = new THREE.Group();
  if (piece.type === 'guard') {
    const shape = new THREE.Shape(SHIELD.map(([dr, dc]) => new THREE.Vector2(dc, -dr)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: PIECE_H, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // extrusion now goes up, shape y (= -dr) maps to z = dr
    g.add(new THREE.Mesh(geo, mat));
  } else {
    for (const [dr, dc, lr, lc] of BARS[piece.type]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(lc, PIECE_H, lr), mat);
      m.position.set(dc, PIECE_H / 2, dr);
      g.add(m);
    }
  }
  return g;
}

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
  let clickCb = () => {};

  const clear = (group) => {
    for (const o of [...group.children]) {
      group.remove(o);
      o.traverse((x) => { x.geometry?.dispose(); x.material?.dispose(); });
    }
  };

  function setBoard(b) {
    board = b;
    clear(boardGroup);
    for (let r = 1; r <= 10; r++)
      for (let c = 1; c <= 10; c++) {
        const h = top(b[r][c]) - FLOOR;
        const geo = new THREE.BoxGeometry(0.98, h, 0.98);
        const col = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colorForHeight(b[r][c]) }));
        col.position.set(cx(c), FLOOR + h / 2, cz(r));
        col.userData = { r, c };
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
        col.add(edges);
        boardGroup.add(col);
      }
  }

  function setPieces(pieces, selectedId) {
    clear(pieceGroup);
    for (const p of pieces) {
      const m = pieceMesh(p);
      m.position.set(cx(p.c), top(board[p.r][p.c]) + (p.id === selectedId ? 0.15 : 0), cz(p.r));
      m.traverse((x) => { x.userData = { r: p.r, c: p.c }; });
      pieceGroup.add(m);
    }
  }

  function setHighlights(cells) {
    clear(highlightGroup);
    for (const [r, c] of cells) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9),
        new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.6 }));
      plate.position.set(cx(c), top(board[r][c]) + 0.02, cz(r));
      plate.userData = { r, c };
      highlightGroup.add(plate);
    }
  }

  // Click picking, ignored when the pointer moved (camera drag).
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > CLICK_SLOP) return;
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // A highlighted target wins even when a nearer column hides it (moving down towards the camera).
    const hits = ray.intersectObjects([highlightGroup, pieceGroup, boardGroup], true);
    const hit = hits.find((h) => highlightGroup.children.includes(h.object))
      || hits.find((h) => h.object.userData.r !== undefined);
    if (hit) clickCb(hit.object.userData.r, hit.object.userData.c);
  });

  new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(container);

  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  return { setBoard, setPieces, setHighlights, onCellClick: (cb) => { clickCb = cb; } };
}
