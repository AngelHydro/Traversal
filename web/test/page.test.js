import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('index.html uses only relative local paths', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /three@0\.160\.0/);
  assert.match(html, /src="\.\/web\/main\.js"/);
  assert.doesNotMatch(html, /(src|href)="\/(?!\/)/);
});
