// End-to-end check of the page in headless Chromium: loads, frames the board, plays moves, captures,
// and shows the WebGL message when WebGL is off. Skipped when Playwright is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname } from 'node:path';
import * as THREE from '../vendor/three.module.js';
import { generateBoard, makeRng } from '../terrain.js';
import { newGame, actionsFor, applyAction } from '../rules.js';
import { square, newGameState, actionChoices, playChoice } from '../play.js';
import { boardBox, fitCamera, HEIGHT_UNIT, VIEW_DIR } from '../camera.js';

let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* not installed */ }

const ROOT = new URL('../../', import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const W = 1000, H = 700;

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const name = req.url.split('?')[0];
      const path = new URL('.' + (name === '/' ? '/index.html' : name), ROOT);
      const body = await readFile(path);   // read first: a missing file must still get a clean 404
      res.writeHead(200, { 'content-type': TYPES[extname(path.pathname)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return server;
}

// Screen point above a cell, seen from the page's framed camera. rect: the canvas box on the page.
// at(r, c, dz, dy): dz shifts towards the far edge (negative), dy lifts above the top face.
// The highlight plate is 0.04 thick on the top face, so a target is aimed at dy = 0.02.
function projector(board, rect) {
  const s = boardBox(board);
  const aspect = rect.width / rect.height;
  const { position, target } = fitCamera(s.center, s.half, 45, aspect, VIEW_DIR);
  const cam = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
  cam.position.fromArray(position); cam.lookAt(...target); cam.updateMatrixWorld();
  return (r, c, dz, dy) => {
    const v = new THREE.Vector3(c - 5.5, board[r][c] * HEIGHT_UNIT + dy, r - 5.5 + dz).project(cam);
    return [rect.x + ((v.x + 1) / 2) * rect.width, rect.y + ((1 - v.y) / 2) * rect.height];
  };
}

test('page plays a game in a real browser', { skip: !chromium && 'playwright not installed' }, async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // A numbered board is reproducible: the test rebuilds the very same one to aim its clicks.
    await page.goto(`http://127.0.0.1:${server.address().port}/?terrain=woods&plateau=5`);
    await page.waitForFunction(() => document.getElementById('status').textContent !== '');
    assert.equal(await page.textContent('#status'), 'Au tour du joueur 1 (rouge)');
    assert.match(await page.textContent('#score'), /Plateau n° 5/);
    const board = generateBoard('woods', makeRng(5));

    const canvas = page.locator('#view canvas');
    const rect0 = await canvas.boundingBox();
    // The panel is above the view, not over it.
    const panel = await page.locator('#panel').boundingBox();
    assert.ok(panel.y + panel.height <= (await page.locator('#view').boundingBox()).y);
    // Select on the piece itself (dy 0.25); aim at the far half of a target plate (0.04 thick, dy 0.02).
    const click = async ([r, c], dz, dy) => {
      const [x, y] = projector(board, await canvas.boundingBox())(r, c, dz, dy);
      await page.mouse.click(x, y);
      await page.waitForTimeout(100);
    };
    const play = async (g, id, pick) => {
      const piece = g.pieces.find((p) => p.id === id);
      const action = actionsFor(g, piece).filter((a) => a.kind === 'move' && !a.special).sort(pick)[0];
      await click([piece.r, piece.c], 0, 0.25);
      await click(action.to, -0.25, 0.02);
      assert.match(await page.textContent('#last'), new RegExp(`${square(piece.r, piece.c)} → ${square(...action.to)}`));
      return applyAction(g, id, action);
    };

    // Refused actions explain themselves: help is there, a click on the wrong side says whose turn it is.
    assert.match(await page.textContent('#help'), /case jaune.*rouge pour attaquer/);
    await click([1, 5], 0, 0.25);
    assert.match(await page.textContent('#last'), /Au tour du joueur 1 \(rouge\)/);

    // Red's explorer steps straight ahead, then blue's sentinel moves.
    let g = newGame(board);
    g = await play(g, 'red-2', (a, b) => Math.abs(a.to[1] - 5) - Math.abs(b.to[1] - 5) || b.to[0] - a.to[0]);
    assert.match(await page.textContent('#status'), /joueur 2 \(bleu\)/);
    g = await play(g, 'blue-0', (a, b) => Math.abs(a.to[1] - 3) - Math.abs(b.to[1] - 3) || a.to[0] - b.to[0]);
    assert.match(await page.textContent('#score'), /Coup 2\/200/);

    assert.deepEqual(await canvas.boundingBox(), rect0, 'the view must not jump while playing with the mouse');

    // Keyboard play: the list holds the side to move's actions in words; Enter-free, focus + select + button.
    await page.focus('#keyboard summary');
    await page.keyboard.press('Enter');                                   // open "Jouer au clavier"
    await page.focus('#choices');
    const options = await page.$$eval('#choices option', (os) => os.map((o) => o.textContent));
    assert.ok(options.length > 5 && options.every((t) => /^\S+ rouge [a-j]\d+ \(hauteur -?\d+\) : /.test(t)), options[0]);
    await page.selectOption('#choices', { index: 0 });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');                                   // the "Jouer" button
    assert.match(await page.textContent('#score'), /Coup 3\/200/);
    assert.match(await page.textContent('#status'), /joueur 2 \(bleu\)/);
    assert.ok((await page.$$eval('#choices option', (os) => os.map((o) => o.textContent))).every((t) => / bleue? /.test(t)));
    assert.deepEqual(errors, []);

    // A lost WebGL context is reported, and the banner goes away once the browser restores it.
    const lose = await page.evaluateHandle(() =>
      document.querySelector('#view canvas').getContext('webgl2').getExtension('WEBGL_lose_context'));
    await lose.evaluate((x) => x.loseContext());
    await page.waitForSelector('#error:not([hidden])');
    assert.match(await page.textContent('#error'), /interrompu/);
    await lose.evaluate((x) => x.restoreContext());
    await page.waitForSelector('#error[hidden]', { state: 'attached' });

    // An error inside a handler is shown, and a later WebGL restore does not hide it.
    await page.evaluate(() => {
      const sel = document.getElementById('landscape');
      sel.append(new Option('inconnu', '999'));
      sel.value = '999';
      sel.dispatchEvent(new Event('change'));
    });
    await page.waitForSelector('#error:not([hidden])');
    assert.match(await page.textContent('#error'), /Une erreur est survenue/);
    await lose.evaluate((x) => x.loseContext());
    await lose.evaluate((x) => x.restoreContext());
    await page.waitForTimeout(300);
    assert.match(await page.textContent('#error'), /Une erreur est survenue/);
    assert.equal(await page.$eval('#error', (e) => e.hidden), false);
  } finally {
    await browser.close();
    server.close();
  }
});

test('a piece exits by clicking the cell past the finish line', { skip: !chromium && 'playwright not installed' }, async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/?terrain=woods&plateau=5`);
    await page.waitForFunction(() => document.getElementById('status').textContent !== '');
    const board = generateBoard('woods', makeRng(5));
    let g = newGameState(board, 'Bois');                 // mirrors the page, move for move
    await page.click('#keyboard summary');
    const playKeyboard = async (choice) => {
      await page.selectOption('#choices', { index: actionChoices(g).findIndex((x) => x.label === choice.label) });
      await page.click('#play');
      g = playChoice(g, choice);
    };
    // Red runs its explorer up the board (blue plays its first listed move) until it can exit.
    const explorer = () => g.pieces.find((p) => p.id === 'red-2');
    for (let turn = 0; turn < 8 && !actionChoices(g).some((c) => c.pieceId === 'red-2' && c.action.kind === 'exit'); turn++) {
      const mine = actionChoices(g).filter((c) => c.pieceId === 'red-2' && c.action.kind === 'move');
      await playKeyboard(mine.sort((a, b) => a.action.to[0] - b.action.to[0])[0]);
      await playKeyboard(actionChoices(g)[0]);
    }
    const exit = actionChoices(g).find((c) => c.pieceId === 'red-2' && c.action.kind === 'exit');
    assert.ok(exit, 'the explorer reached the finish line');
    await page.waitForTimeout(1200);                     // let the walk animations end
    const canvas = page.locator('#view canvas');
    const at = projector(board, await canvas.boundingBox());
    const e = explorer();
    await page.mouse.click(...at(e.r, e.c, 0, 0.25));
    await page.waitForTimeout(150);
    const [, c] = exit.action.to;                        // the exit plate sits past row 1, at row 1's height
    await page.mouse.click(...at(1, c, -1.1, 0.02));
    await page.waitForTimeout(150);
    assert.match(await page.textContent('#last'), /Explorateur rouge franchit l'arrivée : \+1/);
    assert.match(await page.textContent('#score'), /rouge 1/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});

test('settings: change, apply at once, and survive a reload', { skip: !chromium && 'playwright not installed' }, async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, colorScheme: 'light' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`http://127.0.0.1:${server.address().port}/?terrain=desert&plateau=3`);
    await page.waitForFunction(() => document.getElementById('status').textContent !== '');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    await page.click('#open-settings');
    assert.equal(await page.$eval('#settings', (d) => d.open), true);
    await page.selectOption('#settings [name=heightMarks]', 'numbers');
    await page.selectOption('#settings [name=palette]', 'classic');
    await page.selectOption('#settings [name=theme]', 'dark');
    await page.uncheck('#settings [name=showCosts]');
    await page.check('#settings [name=rotateCamera]');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    await page.click('#settings .close');
    assert.equal(await page.$eval('#settings', (d) => d.open), false);

    await page.reload();
    await page.waitForFunction(() => document.getElementById('status').textContent !== '');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    assert.deepEqual(await page.$eval('#settings form', (f) => [f.heightMarks.value, f.palette.value, f.theme.value,
      f.showCosts.checked, f.rotateCamera.checked, f.animations.checked]), ['numbers', 'classic', 'dark', false, true, true]);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});

test('on a phone the panel leaves most of the screen to the board', { skip: !chromium && 'playwright not installed' }, async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => document.getElementById('status').textContent !== '');
    const panel = await page.locator('#panel').boundingBox();
    assert.ok(panel.y + panel.height <= 667 * 0.3, `panel bottom at ${panel.y + panel.height}px`);
  } finally {
    await browser.close();
    server.close();
  }
});

test('page explains a missing WebGL', { skip: !chromium && 'playwright not installed' }, async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector('#error:not([hidden])');
    const text = await page.textContent('#error');
    assert.match(text, /WebGL/);
    assert.match(text, /accélération graphique/);   // tells the player how to fix it (Edge, Chrome…)
  } finally {
    await browser.close();
    server.close();
  }
});
