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
  await p.addInitScript(() => {
    // Force the plain-download path and provide an in-memory backup folder.
    delete window.showSaveFilePicker;
    window.__files = {}; // flat map: relative path -> text content
    const mkDir = (name, prefix, tree) => ({
      name,
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      getDirectoryHandle: async (n, o) => {
        const key = prefix + n + '/';
        if (!tree.has(key)) { if (!(o && o.create)) throw Object.assign(new Error('nf'), { name: 'NotFoundError' }); tree.set(key, true); }
        return mkDir(n, key, tree);
      },
      getFileHandle: async (n, o) => {
        const key = prefix + n;
        if (!(key in window.__files)) { if (!(o && o.create)) throw Object.assign(new Error('nf'), { name: 'NotFoundError' }); window.__files[key] = ''; }
        return {
          createWritable: async () => {
            let buf = '';
            return {
              write: async (d) => { buf += typeof d === 'string' ? d : await d.text(); },
              close: async () => { window.__files[key] = buf; },
            };
          },
          getFile: async () => new File([window.__files[key]], n),
        };
      },
    });
    window.showDirectoryPicker = async () => mkDir('TestDir', '', new Map());
  });
  await p.goto(URL_INDEX);
  return p;
}
const go = (p, v) => p.click(`.nv[data-v="${v}"]`);

test('every view renders without JavaScript errors', async () => {
  page = await fresh();
  for (const v of ['dashboard', 'tasks', 'files', 'requests', 'portfolio', 'templates', 'automations', 'docs', 'session', 'settings', 'info']) {
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

test('Excel export respects the selected filters', async () => {
  page = await fresh();
  await go(page, 'tasks');
  await page.selectOption('[data-ch=fs]', 'Done');
  const n = Number(await page.innerText('#xln'));
  assert.ok(n > 0 && n < 16, 'filter did not reduce the count');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=xlsx]')]);
  assert.match(dl.suggestedFilename(), /^labpm-tasks-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const buf = require('node:fs').readFileSync(await dl.path());
  assert.strictEqual(buf.subarray(0, 2).toString(), 'PK');
  const txt = buf.toString('latin1');
  assert.ok(txt.includes('xl/worksheets/sheet1.xml') && txt.includes('xl/styles.xml'));
  assert.strictEqual((txt.match(/<row /g) || []).length, n + 1 + 13); // header + rows + info sheet rows
  assert.deepStrictEqual(errors, []);
});

test('backup folder: initial copy, then autosave on every change', async () => {
  page = await fresh();
  await go(page, 'session');
  await page.click('[data-act=foldersel]');
  await page.waitForFunction(() => Object.keys(window.__files).some((k) => k.startsWith('labpm-initial-')));
  await page.waitForFunction(() => window.__files['labpm-autosave.json']);
  // free-text edit is saved without leaving the field
  await go(page, 'tasks');
  await page.click('tr[data-act=open] >> nth=0');
  await page.fill('textarea[data-f=notes]', 'autosave probe');
  await page.waitForFunction(() => (window.__files['labpm-autosave.json'] || '').includes('autosave probe'), null, { timeout: 5000 });
  const saved = JSON.parse(await page.evaluate(() => window.__files['labpm-autosave.json']));
  assert.strictEqual(saved.v, 1);
  assert.deepStrictEqual(errors, []);
});

test('empty database: downloadable file loads and every view renders', async () => {
  page = await fresh();
  await go(page, 'session');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=emptyfile]')]);
  assert.strictEqual(dl.suggestedFilename(), 'labpm-empty.json');
  const file = await dl.path();
  const db = JSON.parse(require('node:fs').readFileSync(file, 'utf8'));
  assert.deepStrictEqual([db.v, db.tasks.length, db.projects.length, db.users.length], [1, 0, 0, 1]);
  await page.setInputFiles('#sf', file);
  await page.waitForFunction(() => document.body.innerText.includes('Session opened'));
  for (const v of ['dashboard', 'tasks', 'files', 'requests', 'portfolio', 'templates', 'automations', 'docs', 'session', 'settings', 'info']) {
    await go(page, v);
    for (const t of v === 'tasks' ? ['list', 'board', 'timeline', 'calendar', 'workload'] : [null]) {
      if (t) await page.click(`[data-act=tview][data-v=${t}]`);
    }
  }
  assert.deepStrictEqual(errors, []);
});

test('Clear all project data empties the database after confirmation', async () => {
  page = await fresh();
  await go(page, 'session');
  await page.click('[data-act=clearall]');
  assert.ok((await page.innerText('#vb')).includes('Confirm: delete ALL'));
  await page.click('[data-act=clearall]');
  await page.waitForFunction(() => document.body.innerText.includes('All project data cleared'));
  await go(page, 'tasks');
  assert.strictEqual(await page.locator('tr[data-act=open]').count(), 0);
  const ls = JSON.parse(await page.evaluate(() => localStorage.getItem('labpm_v1')));
  assert.deepStrictEqual([ls.tasks.length, ls.projects.length, ls.docs.length, ls.rules.length, ls.users.length > 0], [0, 0, 0, 0, true]);
  assert.deepStrictEqual(errors, []);
});

test('attachments are copied to <folder>/attachments/ from a task and from the Files page', async () => {
  page = await fresh();
  await go(page, 'session');
  await page.click('[data-act=foldersel]');
  await page.waitForFunction(() => window.__files['labpm-autosave.json']);
  // from the task drawer
  await go(page, 'tasks');
  await page.click('tr[data-act=open] >> nth=0');
  await page.setInputFiles('#drpanel input[type=file]', { name: 'dsc: run 1.txt', mimeType: 'text/plain', buffer: Buffer.from('thermogram') });
  await page.waitForFunction(() => Object.keys(window.__files).some((k) => /^attachments\/task-[a-z0-9-]+-t1\/dsc_ run 1\.txt$/.test(k)));
  // same name again -> numeric suffix
  await page.setInputFiles('#drpanel input[type=file]', { name: 'dsc: run 1.txt', mimeType: 'text/plain', buffer: Buffer.from('second') });
  await page.waitForFunction(() => Object.keys(window.__files).some((k) => k.endsWith('dsc_ run 1 (2).txt')));
  // from the Files page (project-level)
  await page.keyboard.press('Escape');
  await go(page, 'files');
  await page.setInputFiles('input[data-ch=attach]', { name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await page.waitForFunction(() => Object.keys(window.__files).some((k) => /^attachments\/project-[a-z0-9-]+-p1\/plan\.pdf$/.test(k)));
  const rows = await page.locator('#vb .lst > div').count();
  assert.strictEqual(rows, 3);
  const ls = JSON.parse(await page.evaluate(() => localStorage.getItem('labpm_v1')));
  assert.strictEqual(ls.files.length, 3);
  assert.ok(ls.files.every((f) => f.path.startsWith('attachments/')));
  // saving a copy reads the file back from the folder
  const [cp] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=fsave] >> nth=0')]);
  assert.ok(cp.suggestedFilename().length > 0);
  // removing the link keeps the file
  await page.click('[data-act=frm] >> nth=0');
  assert.strictEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('labpm_v1'))).files.length, 2);
  assert.ok(await page.evaluate(() => Object.keys(window.__files).filter((k) => k.startsWith('attachments/')).length === 3));
  assert.deepStrictEqual(errors, []);
});

test('attachments require a connected folder', async () => {
  page = await fresh();
  await go(page, 'files');
  assert.ok((await page.innerText('#vb')).includes('No backup folder connected'));
  await go(page, 'tasks');
  await page.click('tr[data-act=open] >> nth=0');
  assert.strictEqual(await page.locator('#drpanel input[type=file]').count(), 0);
});
