// License-Identifier: PolyForm-Noncommercial-1.0.0
// Copyright (c) 2026 Flavio Pendolino
// https://polyformproject.org/licenses/noncommercial/1.0.0
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const URL_INDEX = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
let browser, page, errors;

before(async () => {
  browser = await chromium.launch();
});
after(async () => { await browser.close(); });

async function fresh() {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 860 } });
  const p = await ctx.newPage();
  errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  // Google Fonts are optional; the app falls back to system fonts.
  await p.route('**/fonts.googleapis.com/**', (r) => r.abort());
  await p.goto(URL_INDEX);
  return p;
}
const go = (p, v) => p.click(`.nv[data-v="${v}"]`);

test('every view renders without JavaScript errors', async () => {
  page = await fresh();
  for (const v of ['dashboard', 'tasks', 'requests', 'portfolio', 'templates', 'automations', 'docs', 'session', 'settings', 'info']) {
    await go(page, v);
    assert.ok((await page.innerText('#vb')).length > 20, `view ${v} is empty`);
  }
  for (const t of ['list', 'board', 'timeline', 'calendar', 'workload']) {
    await go(page, 'tasks');
    await page.click(`[data-act=tview][data-v=${t}]`);
  }
  assert.deepStrictEqual(errors, []);
});

test('UI is fully English (no Italian status or role labels)', async () => {
  page = await fresh();
  const text = await page.innerText('body');
  for (const w of ['Da fare', 'In corso', 'Completato', 'Ricercatore', 'Richieste', 'Impostazioni']) {
    assert.ok(!text.includes(w), `unexpected Italian label: ${w}`);
  }
});

test('intake request lands in triage and can be accepted', async () => {
  page = await fresh();
  await go(page, 'requests');
  await page.fill('#rq-t', 'Smoke test request');
  await page.click('[data-act=reqsubmit]');
  assert.ok((await page.innerText('#vb')).includes('Smoke test request'));
  await page.click('[data-act=reqaccept] >> nth=0');
  assert.deepStrictEqual(errors, []);
});

test('template creates a project with dependent tasks', async () => {
  page = await fresh();
  await go(page, 'templates');
  await page.click('[data-act=tplsel][data-id=ext]');
  await page.click('[data-act=tplcreate]');
  await page.click('[data-act=tview][data-v=timeline]');
  assert.ok((await page.locator('.tl-svg path').count()) > 0, 'dependency arrows missing');
});

test('session can be saved to a JSON file', async () => {
  page = await fresh();
  await go(page, 'session');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=savefile]')]);
  assert.match(dl.suggestedFilename(), /^labpm-session-\d{4}-\d{2}-\d{2}\.json$/);
});

test('Researcher role cannot create tasks', async () => {
  page = await fresh();
  await page.selectOption('[data-ch=me]', 'u4');
  await go(page, 'tasks');
  assert.strictEqual(await page.locator('[data-act=newtask]').count(), 0);
});
