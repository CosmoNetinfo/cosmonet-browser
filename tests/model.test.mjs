import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { normalizeSettings, safeWebUrl, searchUrl, createSettingsStore } from '../extensions/cosmo-home/model.mjs';

test('shortcuts accept web URLs and reject executable, file and credential URLs', () => {
  assert.equal(safeWebUrl('example.com'), 'https://example.com/');
  assert.equal(safeWebUrl('http://localhost:8080/a'), 'http://localhost:8080/a');
  const credentialUrl = new URL('https://example.com');
  credentialUrl.username = 'test-user';
  credentialUrl.password = randomUUID();
  for (const input of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd',
    'chrome://settings', credentialUrl.href, 'https://exa\nmple.com', '', null]) {
    assert.equal(safeWebUrl(input), null, String(input));
  }
});

test('settings discard unknown fields and unsafe links from local storage', () => {
  const settings = normalizeSettings({ theme: 'evil', accent: 'red;url(https://evil.test)',
    engine: '__proto__', password: randomUUID(),
    links: [{ name: 'unsafe', url: 'javascript:alert(1)' }, { name: ' Example ', url: 'example.com' }] });
  assert.equal(settings.theme, 'system');
  assert.equal(settings.engine, 'duckduckgo');
  assert.equal(settings.accent, '#53694e');
  assert.equal(settings.password, undefined);
  assert.deepEqual(settings.links, [{ name: 'Example', url: 'https://example.com/' }]);
});

test('link count and labels are bounded', () => {
  const settings = normalizeSettings({ links: Array.from({length: 100}, () => ({name: 'x'.repeat(200), url:'https://example.com'})) });
  assert.equal(settings.links.length, 12);
  assert.equal(settings.links[0].name.length, 50);
  assert.deepEqual(normalizeSettings({links: []}).links, []);
});

test('search text stays encoded data on a known provider', () => {
  assert.equal(searchUrl('  ', 'google'), null);
  assert.equal(searchUrl('a & b # "', 'unknown'), 'https://duckduckgo.com/?q=a%20%26%20b%20%23%20%22');
});

test('local writes remain ordered and recover after storage failure', async () => {
  const writes = [];
  let stored;
  let fail = true;
  const store = createSettingsStore({
    async get() { return {cosmoHome: stored}; },
    async set(value) {
      if (fail) { fail = false; throw Error('disk full'); }
      await new Promise(resolve => setTimeout(resolve, value.cosmoHome.theme === 'dark' ? 20 : 1));
      writes.push(value.cosmoHome.theme);
      stored = value.cosmoHome;
    }
  });
  await assert.rejects(store.save({theme:'sand'}), /disk full/);
  await Promise.all([store.save({theme:'dark'}), store.save({theme:'light'})]);
  assert.deepEqual(writes, ['dark', 'light']);
  assert.equal((await store.load()).theme, 'light');
});

test('extension has no website access, sync storage, background worker or remote code', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extensions/cosmo-home/manifest.json', import.meta.url)));
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.background, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  const source = await readFile(new URL('../extensions/cosmo-home/newtab.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /innerHTML|storage\.sync|fetch\(|eval\(/);
});
