# Version web Three.js — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publier sur GitHub Pages une version jouable dans le navigateur du jeu de `game.py` : terrain 3D généré aléatoirement, pièces (soldat, garde, médecin) et déplacements selon les règles d'élévation.

**Architecture:** Site statique sans build : `index.html` à la racine et des modules ES dans `web/`. La logique pure (génération du terrain, règles de déplacement) vit dans des modules sans dépendance au DOM, testés avec `node --test`. Le rendu Three.js et l'interface sont des couches minces au-dessus.

**Tech Stack:** HTML + JavaScript (modules ES), Three.js 0.160.0 via importmap jsDelivr, OrbitControls (addons), `node:test` (Node ≥ 18, aucune dépendance npm).

**Spec:** Pas de document de spec séparé. Le plan s'appuie sur `game.py` (comportement de référence, lignes citées par tâche) et sur `README.md`, section « Board Physics ».

## Global Constraints

- Aucun outil de build ni `npm install` : les fichiers du repo sont servis tels quels par Pages.
- Three.js est épinglé : `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` et `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/` pour `three/addons/`.
- Tous les chemins sont relatifs (`./web/main.js`, jamais `/web/...`), car le site est servi sous `/Traversal/`.
- Plateau stocké en `12×12` avec une bordure fixe à 0 ; cases jouables `r, c ∈ 1..10`, comme dans `game.py`.
- `game.py` et le reste du code Python ne sont pas modifiés.
- Textes de l'interface en français ; identifiants du code en anglais.
- Fichier `.nojekyll` à la racine, pour que Pages serve `index.html` sans passer par Jekyll.

## Review Focus

1. **Génération qui ne termine jamais** (surtout le terrain mixte) : chacun des 14 terrains doit se générer, valide, en moins d'une seconde. → test `every landscape generates a valid board` (Task 1).
2. **Déplacements interdits acceptés** : monter de +2, descendre de −3, sortir du plateau (r/c = 0 ou 11), aller sur une case occupée. → tests `legalMoves rejects ...` (Task 2).
3. **Couleur aux extrêmes ±10** (Everest / fosse des Mariannes) : index hors du tableau, cubes sans couleur. → test `colorForHeight covers -10..10` (Task 1).
4. **Faire pivoter la caméra déclenche un clic** (souris et tactile) : un glisser ne doit pas sélectionner de case. → contrôle manuel, seuil de 5 px entre `pointerdown` et `pointerup` (Task 3).
5. **Chemins absolus ou CDN injoignable** : page blanche sous `/Traversal/`. → test `index.html uses only relative local paths`, plus un message d'erreur visible si `main.js` ne se charge pas (Task 4).

---

### Task 1: Génération du terrain (`web/terrain.js`)

Port de `gen_board` (game.py:21), `gen_mix_board` (115), `check_board` (187), `board_scramble` (204) et de la table de couleurs `color_stick` (647).

**Files:**
- Create: `web/package.json` → `{"type": "module"}`
- Create: `web/terrain.js`
- Test: `web/test/terrain.test.js`

**Interfaces:**
- Produces:
  - `SIZE = 12`
  - `LANDSCAPES: Array<{id: number, group: string, name: string, kind: 'scramble'|'max'|'min'|'mix', factor?: number}>`
  - `boardBounds(): {min: number[][], max: number[][]}` : l'anneau `i` (1..5) a min `−2i` et max `+2i` (game.py:15-19).
  - `isValidBoard(board: number[][]): boolean`
  - `generateBoard(landscapeId: number, rng?: () => number): number[][]` (rng par défaut : `Math.random`)
  - `colorForHeight(h: number): number` : couleur hexadécimale Three.js.

Table `LANDSCAPES`, copiée de game.py:550-604 :

| id | groupe | nom | kind | factor |
|---|---|---|---|---|
| 1/2/3 | Montagnes | Hautes / Moyennes / Basses | scramble | 0.15 / 0.225 / 0.3 |
| 4/5/6 | Forêts | Hautes / Moyennes / Basses | scramble | 0.4 / 0.5 / 0.6 |
| 7/8/9 | Vallées | Hautes / Moyennes / Basses | scramble | 0.7 / 0.775 / 0.85 |
| 10 | Spécial | Mont Everest | max | — |
| 11 | Spécial | Gasherbrum I | scramble | 0.1 |
| 12 | Spécial | Montagnes et vallées | mix | 0.5 (push 250) |
| 13 | Spécial | Fosse des Kouriles | scramble | 0.9 |
| 14 | Spécial | Fosse des Mariannes | min | — |

Couleurs (index `h + 10`, par tranches de 3) : `navy 0x000080`, `dodgerblue 0x1e90ff`, `saddlebrown 0x8b4513`, `green 0x008000`, `grey 0x808080`, `white 0xffffff`, `skyblue 0x87ceeb`.

- [ ] **Step 1: Écrire les tests qui échouent**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBoard, isValidBoard, colorForHeight, LANDSCAPES, SIZE } from '../terrain.js';

function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

test('every landscape generates a valid board', () => {
  for (const { id } of LANDSCAPES) {
    const t = Date.now();
    const b = generateBoard(id, seeded(id));
    assert.equal(b.length, SIZE);
    assert.ok(isValidBoard(b), `landscape ${id}`);
    assert.ok(Date.now() - t < 1000, `landscape ${id} too slow`);
    for (let i = 0; i < SIZE; i++) assert.equal(b[0][i] + b[11][i] + b[i][0] + b[i][11], 0);
  }
});
test('Everest is the max board, Mariana the min', () => {
  assert.equal(generateBoard(10)[5][5], 10);
  assert.equal(generateBoard(14)[5][5], -10);
  assert.equal(generateBoard(10)[1][1], 2);
});
test('isValidBoard rejects a step of 3', () => {
  const b = generateBoard(10); b[1][1] = -1;
  assert.equal(isValidBoard(b), false);
});
test('colorForHeight covers -10..10', () => {
  assert.equal(colorForHeight(-10), 0x000080);
  assert.equal(colorForHeight(0), 0x008000);
  assert.equal(colorForHeight(10), 0x87ceeb);
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `node --test web/test/`
Expected: FAIL, `Cannot find module .../web/terrain.js`

- [ ] **Step 3: Implémenter `web/terrain.js`**

Porter `gen_board` et `gen_mix_board` ligne à ligne. Points à respecter :
- `np.random.randint(a, b)` exclut `b` : `a + Math.floor(rng() * (b - a))`.
- `np.rot90` appliqué deux fois revient à une rotation de 180° : `m[i][j] = m[11-i][11-j]`.
- Garder la limite de 1e5 échecs consécutifs (`strikes`) du terrain mixte.
- `scramble` enchaîne 4 passes de 150 sur les plages `[1,11)`, `[2,10)`, `[3,9)`, `[4,8)` (game.py:204).
- `max` et `min` renvoient des copies de `boardBounds()`.

- [ ] **Step 4: Vérifier que les tests passent**

Run: `node --test web/test/`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/terrain.js web/test/terrain.test.js
git commit -m "feat(web): port terrain generation to JS"
```

---

### Task 2: Pièces et règles de déplacement (`web/rules.js`)

Règle de game.py:668-671, la même pour toutes les pièces : un pas orthogonal vers une case de même hauteur, d'une unité plus haute, ou d'une à deux unités plus basse.

**Choix par défaut (game.py ne le définit pas, à ajuster si besoin) :** chaque camp a 10 pièces sur sa première rangée, dans l'ordre de colonne 1 à 10 `S S G S M M S G S S` (S = soldat, G = garde, M = médecin). Les noirs sont en `r = 1` et jouent en premier (« Player 1 », `team == True` = noir dans game.py) ; les rouges sont en `r = 10`. Une pièce ne peut pas aller sur une case occupée. Pas de capture ni de condition de victoire : game.py n'en définit pas.

**Files:**
- Create: `web/rules.js`
- Test: `web/test/rules.test.js`

**Interfaces:**
- Consumes: `generateBoard`, `boardBounds` (Task 1)
- Produces:
  - `type Piece = {id: string, type: 'soldier'|'guard'|'medic', team: 'black'|'red', r: number, c: number}`
  - `initialPieces(): Piece[]`
  - `canStep(fromH: number, toH: number): boolean` : vrai si `toH - fromH ∈ {1, 0, −1, −2}`
  - `legalMoves(board: number[][], pieces: Piece[], piece: Piece): Array<[number, number]>`
  - `movePiece(pieces: Piece[], id: string, r: number, c: number): Piece[]` : renvoie un nouveau tableau, sans modifier l'entrée.

- [ ] **Step 1: Écrire les tests qui échouent**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canStep, legalMoves, initialPieces, movePiece } from '../rules.js';
import { boardBounds } from '../terrain.js';

const flat = () => Array.from({ length: 12 }, () => Array(12).fill(0));
const p = (r, c, team = 'black') => ({ id: `${team}${r}${c}`, type: 'soldier', team, r, c });

test('canStep follows the elevation rule', () => {
  assert.deepEqual([2, 1, 0, -1, -2, -3].map(d => canStep(0, d)), [false, true, true, true, true, false]);
});
test('legalMoves rejects off-board cells', () => {
  assert.deepEqual(legalMoves(flat(), [p(1, 1)], p(1, 1)).sort(), [[1, 2], [2, 1]]);
});
test('legalMoves rejects occupied cells', () => {
  const pcs = [p(5, 5), p(5, 6, 'red')];
  assert.equal(legalMoves(flat(), pcs, pcs[0]).some(([r, c]) => r === 5 && c === 6), false);
});
test('legalMoves rejects climbing 2', () => {
  const b = boardBounds().max;           // [1][1]=2, [2][2]=4
  const b2 = b.map(row => [...row]); b2[2][1] = 4; b2[1][2] = 3;
  assert.deepEqual(legalMoves(b2, [p(1, 1)], p(1, 1)), [[1, 2]]);
});
test('initialPieces: 10 per team, black on row 1', () => {
  const pcs = initialPieces();
  assert.equal(pcs.filter(x => x.team === 'black' && x.r === 1).length, 10);
  assert.equal(pcs.filter(x => x.team === 'red' && x.r === 10).length, 10);
});
test('movePiece does not mutate', () => {
  const pcs = [p(5, 5)];
  const out = movePiece(pcs, pcs[0].id, 5, 6);
  assert.equal(pcs[0].c, 5); assert.equal(out[0].c, 6);
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `node --test web/test/`
Expected: FAIL, `Cannot find module .../web/rules.js`

- [ ] **Step 3: Implémenter `web/rules.js`** avec les signatures ci-dessus.

- [ ] **Step 4: Vérifier que les tests passent**

Run: `node --test web/test/`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add web/rules.js web/test/rules.test.js
git commit -m "feat(web): piece movement rules"
```

---

### Task 3: Rendu 3D (`web/scene.js`)

**Files:**
- Create: `web/scene.js`

**Interfaces:**
- Consumes: `colorForHeight` (Task 1), `Piece` (Task 2)
- Produces : `createScene(container: HTMLElement): { setBoard(board), setPieces(pieces, selectedId?), setHighlights(cells: Array<[r,c]>), onCellClick(cb: (r, c) => void) }`

Choix de rendu :
- Repère : case `(r, c)` centrée en `x = c − 5.5`, `z = r − 5.5`. Une unité de hauteur vaut `HEIGHT_UNIT = 0.5`.
- Chaque case est une colonne `BoxGeometry(0.98, …, 0.98)` qui va du plancher `y = −11 · HEIGHT_UNIT` jusqu'au sommet `h · HEIGHT_UNIT`, de couleur `colorForHeight(h)`, avec des arêtes noires (`EdgesGeometry`, opacité 0.5). Les colonnes pleines remplacent le bricolage de comblement des trous de `plot_board`.
- Pièces : formes plates extrudées de 0.25 de haut, posées sur le sommet de leur case, en noir `0x111111` ou rouge `0xcc0000`. Silhouettes reprises de game.py : soldat = épée en croix (391), garde = bouclier pentagonal (452), médecin = croix « + » (494). La pièce sélectionnée est surélevée de 0.15.
- Cases jouables : plaque jaune `0xffd700` semi-transparente posée sur le sommet.
- `OrbitControls`, `HemisphereLight` + `DirectionalLight`, redimensionnement via `ResizeObserver`.
- Clic : `Raycaster` sur les colonnes, chaque mesh portant `userData = {r, c}`. Un clic sur une pièce renvoie la case sous la pièce. Le clic n'est accepté que si le pointeur s'est déplacé de moins de 5 px entre `pointerdown` et `pointerup` (Review Focus n° 4).

- [ ] **Step 1: Implémenter `web/scene.js`**

- [ ] **Step 2: Contrôle visuel**

Run: `python3 -m http.server 8000`, puis ouvrir `http://localhost:8000/` (après la Task 4) ou une page de test temporaire non commitée.
Expected : plateau en terrasses colorées comparable à `images/Render1.png`, rotation à la souris, un glisser ne sélectionne rien.

- [ ] **Step 3: Commit**

```bash
git add web/scene.js
git commit -m "feat(web): Three.js board and piece rendering"
```

---

### Task 4: Page, boucle de jeu et publication

**Files:**
- Create: `index.html`, `web/main.js`, `.nojekyll` (vide)
- Test: `web/test/page.test.js`
- Modify: `README.md` (ajouter un lien « Jouer en ligne » sous le titre)

**Interfaces:**
- Consumes : `LANDSCAPES`, `generateBoard` (Task 1) ; `initialPieces`, `legalMoves`, `movePiece` (Task 2) ; `createScene` (Task 3)

Interface de la page :
- Un `<select>` des terrains regroupés par `group` (`<optgroup>`), un bouton « Nouvelle partie », l'indication « Au tour des noirs / rouges », et le canvas en plein écran.
- Boucle de jeu : un clic sur une pièce du camp actif la sélectionne et surligne ses `legalMoves`. Un clic sur une case surlignée la déplace et passe la main à l'autre camp. Tout autre clic annule la sélection.
- Un `<noscript>` et un `<div id="error" hidden>`, rendu visible par `window.onerror` et par le `onerror` du script module, avec le texte « Impossible de charger le jeu (connexion au CDN ?) ».
- Importmap dans `index.html`, avec les URL des Global Constraints.

- [ ] **Step 1: Écrire le test qui échoue**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('index.html uses only relative local paths', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /three@0\.160\.0/);
  assert.match(html, /src="\.\/web\/main\.js"/);
  assert.doesNotMatch(html, /(src|href)="\/(?!\/)/);
});
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `node --test web/test/`
Expected: FAIL, `ENOENT ... index.html`

- [ ] **Step 3: Implémenter `index.html` et `web/main.js`**, ajouter `.nojekyll` et le lien dans `README.md` : `https://angelhydro.github.io/Traversal/`

- [ ] **Step 4: Vérifier**

Run: `node --test web/test/`
Expected: PASS, 11 tests

Run: `python3 -m http.server 8000`, ouvrir la page, choisir « Montagnes et vallées », jouer deux coups (un noir, un rouge).
Expected : le tour alterne, seules les cases légales sont surlignées et la console ne montre aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add index.html web/main.js web/test/page.test.js .nojekyll README.md
git commit -m "feat(web): playable page for GitHub Pages"
```

- [ ] **Step 6: Publication (action manuelle du propriétaire)**

Après le merge sur `main` : Settings → Pages → Source « Deploy from a branch », `main` / `/ (root)`. Vérifier que `https://angelhydro.github.io/Traversal/` affiche le jeu et non plus le README.
