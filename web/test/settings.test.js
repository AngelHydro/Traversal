import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, OPTIONS, loadSettings, saveSettings } from '../settings.js';

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test('defaults cover every visual setting asked for', () => {
  assert.deepEqual(DEFAULTS, {
    heightMarks: 'notches', showCosts: true, palette: 'soft', theme: 'system', rotateCamera: false, animations: true,
  });
  for (const [k, v] of Object.entries(DEFAULTS)) assert.ok(OPTIONS[k].includes(v), k);
});

test('settings survive a reload, and bad or missing values fall back to the defaults', () => {
  const store = memory();
  saveSettings(store, { ...DEFAULTS, heightMarks: 'numbers', theme: 'dark' });
  assert.deepEqual(loadSettings(store), { ...DEFAULTS, heightMarks: 'numbers', theme: 'dark' });
  assert.deepEqual(loadSettings(memory({ 'traversal-settings': '{"palette":"neon","showCosts":false}' })),
    { ...DEFAULTS, showCosts: false });
  assert.deepEqual(loadSettings(memory({ 'traversal-settings': 'not json' })), DEFAULTS);
});

test('a blocked storage (private window, disabled cookies) never breaks the game', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadSettings(broken), DEFAULTS);
  assert.doesNotThrow(() => saveSettings(broken, DEFAULTS));
  assert.deepEqual(loadSettings(undefined), DEFAULTS);
});
