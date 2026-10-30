import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const html = read('admin.html');
const script = read('saluz-minimal.js');
const styles = read('saluz-minimal.css');
const builder = read('.github/scripts/build-saluz-admin-preview.py');

test('nova camada carrega ao final e preserva os módulos originais', () => {
  assert.match(html, /saluz-admin-v3\.js/);
  assert.match(html, /saluz-minimal\.css/);
  assert.match(html, /saluz-minimal\.js/);
  assert.ok(html.lastIndexOf('saluz-admin-v3.js') < html.lastIndexOf('saluz-minimal.js'));
  for (const id of ['overview','products','campaigns','studio','orders','customers','finance','reports']) {
    assert.ok(html.includes('id="tab-' + id + '"'), id);
  }
  assert.match(builder, /saluz-minimal\.css/);
  assert.match(builder, /saluz-minimal\.js/);
});

test('escopo de homologação e isolamento de rotinas operacionais', () => {
  assert.match(script, /location\.hostname !== "homologacao\.saluz-admin\.pages\.dev"/);
  assert.match(script, /classList\.contains\("saluz-v3"\)/);
  assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
  assert.match(script, /campaign-publish/);
  assert.match(script, /campaign-apply/);
  assert.match(script, /studio-discard/);
  assert.match(script, /product-preview/);
});

test('interface preserva acessibilidade, responsividade e conteúdo escondido acessível', () => {
  assert.match(script, /make\("details"/);
  assert.match(script, /make\("summary"/);
  assert.match(styles, /@media\(max-width:780px\)/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\[hidden\]/);
});

test('Focus V4 organiza a navegação e oferece modos de listagem e edição', () => {
  assert.match(script, /saluz-focus-nav-extra/);
  assert.match(script, /saluz-focus-browse/);
  assert.match(script, /saluz-focus-editing/);
  assert.match(script, /saluz-focus-arranging/);
  assert.match(script, /saluz-focus-store-preview/);
  assert.match(script, /saluz-focus-fee-settings/);
  assert.match(styles, /saluz-focus-browse \.market-editor-area/);
  assert.match(styles, /saluz-focus-editing \.market-catalog/);
  assert.match(styles, /saluz-focus-fee-settings/);
  assert.ok(html.includes('saluz-minimal.js?v=20261030-focus4'));
  assert.ok(html.includes('saluz-minimal.css?v=20261030-atelier5'));
  assert.match(styles, /SALUZ Atelier V5/);
  assert.match(styles, /body\.saluz-v3\.saluz-minimal\.saluz-focus/);
  assert.match(styles, /--atelier-coffee/);
  assert.match(styles, /\.mobile-bottom-nav/);
});
