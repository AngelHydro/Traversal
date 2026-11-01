import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;

test('index.html uses only relative local paths', () => {
  assert.match(html, /src="\.\/web\/main\.js"/);
  assert.doesNotMatch(html, /(src|href)="\/(?!\/)/);
});
test('three.js is vendored, no third-party script origin', () => {
  assert.equal(map.three, './web/vendor/three.module.js');
  assert.equal(map['three/addons/'], './web/vendor/addons/');
  assert.doesNotMatch(html, /https?:\/\/[^"]*\.js/);
  for (const f of ['three.module.js', 'addons/controls/OrbitControls.js', 'LICENSE'])
    assert.ok(existsSync(new URL(`../vendor/${f}`, import.meta.url)), f);
  assert.match(readFileSync(new URL('../vendor/three.module.js', import.meta.url), 'utf8'), /REVISION = '160'/);
});
test('error banner is only for load failures', () => {
  assert.doesNotMatch(html, /window\.onerror/);
});
test('moves are announced to screen readers', () => {
  assert.match(html, /id="last"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /id="status"[^>]*aria-live/);   // the message already names the turn
});
test('main.js reports a missing WebGL instead of a blank page', () => {
  const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(main, /catch[\s\S]*WebGL/);
});
