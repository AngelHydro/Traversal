// End-to-end check of the page in headless Chromium: loads, frames the board, plays moves, captures,
// and shows the WebGL message when WebGL is off. Skipped when Playwright is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname } from 'node:path';
import * as THREE from '../vendor/three.module.js';
import { boardBounds } from '../terrain.js';
import { boardSphere, fitCamera, HEIGHT_UNIT } from '../camera.js';

let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* not installed */ }

const ROOT = new URL('../../', import.meta.url);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const W = 1000, H = 700;

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const path = new URL('.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]), ROOT);
      res.writeHead(200, { 'content-type': TYPES[extname(path.pathname)] || 'application/octet-stream' });
      res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return server;
}

// Screen point above a cell, seen from the page's framed camera. rect: the canvas box on the page.
// at(r, c, dz, dy): dz shifts towards the far edge (negative), dy lifts above the top face.
// The highlight plate is 0.04 thick on the top face, so a target is aimed at dy = 0.02.
function projector(board, rect) {
  const s = boardSphere(board);
  const aspect = rect.width / rect.height;
  const { position, target } = fitCamera(s.center, s.radius, 45, aspect, [0, 13, 13]);
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
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => document.getElementById('status').textContent !== '');
    assert.equal(await page.textContent('#status'), 'Au tour des noirs');

    await page.selectOption('#landscape', '14'); // Fosse des Mariannes: fixed heights
    await page.waitForTimeout(300);
    const canvas = page.locator('#view canvas');
    const rect0 = await canvas.boundingBox();
    // The panel is above the view, not over it.
    const panel = await page.locator('#panel').boundingBox();
    assert.ok(panel.y + panel.height <= (await page.locator('#view').boundingBox()).y);
    const move = async (from, to) => {
      // Select on the piece itself, then aim at the far half of the target, the part a player sees.
      for (const [cell, dz, dy] of [[from, 0, 0.2], [to, -0.25, 0.02]]) {
        const [x, y] = projector(boardBounds().min, await canvas.boundingBox())(...cell, dz, dy);
        await page.mouse.click(x, y);
        await page.waitForTimeout(100);
      }
    };
    // Column a is the trench's flat rim (height -2 everywhere), so no piece hides behind a column.
    // Black and red walk towards each other along it, then black captures.
    for (const [b, r] of [[1, 10], [2, 9], [3, 8], [4, 7]]) { await move([b, 1], [b + 1, 1]); await move([r, 1], [r - 1, 1]); }
    await move([5, 1], [6, 1]);
    assert.equal(await page.textContent('#status'), 'Au tour des rouges');
    assert.match(await page.textContent('#captures'), /noirs : 1, rouges : 0/);
    assert.match(await page.textContent('#last'), /soldat noirs a5 → a6, capture un soldat/);
    assert.deepEqual(await canvas.boundingBox(), rect0, 'the view must not jump when the first move is shown');
    assert.deepEqual(errors, []);
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
    assert.match(await page.textContent('#error'), /WebGL/);
  } finally {
    await browser.close();
    server.close();
  }
});
