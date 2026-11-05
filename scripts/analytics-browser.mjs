// Browser integration tests use built local files and a fake GA loader. No third-party traffic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { hubspotFixture, hubspotLoader } from './hubspot-fixture.mjs';

const root = path.resolve('dist');
const key = 'epaper-analytics-consent-v1';
const origin = 'https://epaper.rs';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    let googleLoads = 0;
    const errors = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) {
        const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const file = path.resolve(root, relative.endsWith('/') || relative === '' ? relative + 'index.html' : relative);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
        return route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream' });
      }
      if (url.href === hubspotLoader) return route.fulfill({ contentType: 'application/javascript', body: hubspotFixture });
      if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
        googleLoads++;
        assert.equal(url.searchParams.get('id'), 'G-RSL6BXCYFF');
        return route.fulfill({ contentType: 'application/javascript', body: 'window.__fakeGoogleLoaded = true;' });
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin + '/');
    const panel = page.locator('[data-analytics-consent]');
    await panel.waitFor({ state: 'visible' });
    assert.equal(googleLoads, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.locator('[data-analytics-choice="denied"]').click();
    assert.equal(await panel.isVisible(), false);
    assert.equal(googleLoads, 0);
    assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).choice, key), 'denied');
    await page.reload();
    assert.equal(await panel.isVisible(), false);
    assert.equal(googleLoads, 0);
    await page.locator('[data-analytics-settings]').click();
    await page.locator('[data-analytics-close]').click();
    assert.equal(await panel.isVisible(), false);
    await page.locator('[data-analytics-settings]').click();
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false);
    await page.locator('[data-analytics-settings]').click();
    await page.locator('[data-analytics-choice="granted"]').click();
    await page.waitForFunction(() => window.__fakeGoogleLoaded === true);
    assert.equal(googleLoads, 1);
    const config = await page.evaluate(() => Array.from(window.dataLayer.find(entry => entry[0] === 'config')));
    assert.equal(config[1], 'G-RSL6BXCYFF');
    await page.evaluate(() => { document.cookie = '_ga=fake; Path=/; Secure'; document.cookie = '_ga_RSL6BXCYFF=fake; Path=/; Secure'; });
    await page.locator('[data-analytics-settings]').click();
    await Promise.all([page.waitForNavigation(), page.locator('[data-analytics-choice="denied"]').click()]);
    assert.equal(googleLoads, 1);
    assert.equal(await page.evaluate(() => document.cookie.includes('_ga')), false);
    assert.equal(await panel.isVisible(), false);
    await page.goto(origin + '/kontakt/');
    await page.waitForFunction(() => document.querySelector('#hubspot-form')?.dataset.state === 'ready');
    assert.equal(googleLoads, 1);
    assert.equal(await page.locator('#google-analytics').count(), 1);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => v.id));
    assert.deepEqual(violations, []);
    assert.deepEqual(errors, []);
    results.push(`${viewport.width}px: accept/reject, remembered denial, settings, close/Escape, single tag, withdrawal/reload/cookies, unaffected HubSpot, accessibility`);
    await context.close();
  }
  console.log(JSON.stringify({ results, externalRequests: 0 }, null, 2));
} finally {
  await browser.close();
}
