const { chromium } = require('playwright');
const { strict: assert } = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const extension = path.resolve('extensions/cosmo-home');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-extension-test-'));
  let context;
  const errors = [];
  const requests = [];
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true,
      ...(process.env.COSMO_TEST_BROWSER ? {executablePath:process.env.COSMO_TEST_BROWSER} : {}),
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.goto('chrome://newtab/');
    await page.getByRole('heading', {name:'Da dove partiamo?'}).waitFor();
    await page.locator('#shortcuts a').waitFor();
    const home = page.url();
    assert.match(home, /chrome-extension:|chrome:\/\/newtab/);
    await page.getByRole('button', {name:/Personalizza/}).click();
    await page.locator('#theme').selectOption('dark');
    await page.getByRole('status').filter({hasText:'Salvato sul dispositivo.'}).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#engine').selectOption('google');
    await page.waitForFunction(() => !document.getElementById('engine').disabled);
    await page.locator('#link-name').fill('<img src=x onerror=alert(1)>');
    await page.locator('#link-url').fill('javascript:alert(1)');
    await page.getByRole('button', {name:'Aggiungi collegamento'}).click();
    await page.getByRole('status').filter({hasText:'http o https'}).waitFor();
    assert.equal(await page.locator('#shortcuts a').count(), 1);
    await page.locator('#link-url').fill('https://example.com/');
    await page.getByRole('button', {name:'Aggiungi collegamento'}).click();
    await page.waitForFunction(() => document.querySelectorAll('#shortcuts a').length === 2);
    assert.equal(await page.locator('#shortcuts img').count(), 0, 'Names are rendered as text');
    await page.getByRole('button', {name:'Chiudi personalizzazione'}).click();
    await page.reload();
    await page.locator('#shortcuts a').nth(1).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('#search-provider').textContent(), 'Ricerca con Google');
    fs.mkdirSync('test-results', {recursive:true});
    await page.screenshot({path:'test-results/cosmo-home-dark.png', fullPage:true});
    await page.getByRole('button', {name:/Personalizza/}).click();
    await page.getByRole('button', {name:/Rimuovi <img/}).click();
    await page.waitForFunction(() => document.querySelectorAll('#shortcuts a').length === 1);
    await page.locator('#theme').selectOption('light');
    await page.waitForFunction(() => !document.getElementById('theme').disabled);
    await page.getByRole('button', {name:'Chiudi personalizzazione'}).click();
    await page.screenshot({path:'test-results/cosmo-home-light.png', fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path:'test-results/cosmo-home-mobile.png', fullPage:true});
    assert.deepEqual(requests, [], 'New tab makes no outgoing web requests');
    assert.deepEqual(errors, [], 'No JavaScript errors');
    await page.route('https://www.google.com/**', route => route.fulfill({body:'search test'}));
    await page.locator('#search').fill('cosmo & privacy');
    await Promise.all([page.waitForURL('https://www.google.com/search?q=cosmo%20%26%20privacy'),
                       page.locator('#search').press('Enter')]);
    console.log('PASS: real extension, local preferences, reload, themes, link validation, text injection, mobile layout, no background network, search');
  } finally {
    if (context) await context.close();
    // Only remove the exact temporary directory created above.
    const resolved = path.resolve(profile);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('cosmo-extension-test-'));
    fs.rmSync(resolved, {recursive:true,force:true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
