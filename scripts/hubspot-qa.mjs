import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { isolateHubSpot, hubspotFixture } from './hubspot-fixture.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://localhost:4321';
const results=[];
try {
 for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await isolateHubSpot(page);
  await page.goto(base+'/kontakt/');
  await page.waitForFunction(()=>document.querySelector('#hubspot-form')?.dataset.state==='ready');
  assert.equal(await page.locator('#hubspot-form form').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await page.locator('#hubspot-status').isVisible(),false);
  assert.equal(await page.locator('#hubspot-form').getAttribute('aria-busy'),'false');
  const config=await page.evaluate(()=>window.__hubspotCalls);
  assert.deepEqual(config,[{portalId:'25754850',formId:'64bc9124-5728-485c-bdf0-ba78b2261c29',region:'eu1',target:'#hubspot-form'}]);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#hubspot-form')?.dataset.state==='ready');
  assert.equal(await page.locator('#hubspot-form form').count(),1);
  await page.goto(base+'/');await page.goBack();
  await page.waitForFunction(()=>document.querySelector('#hubspot-form')?.dataset.state==='ready');
  assert.equal(await page.locator('#hubspot-form form').count(),1);
  results.push(`${width}px: one form, correct config, no overflow, reload and back navigation`);
  await page.close();
 }
 for(const mode of ['blocked','missing','throws']) {
  const page=await browser.newPage();await isolateHubSpot(page,mode);await page.goto(base+'/kontakt/');
  await page.waitForFunction(()=>document.querySelector('#hubspot-form')?.dataset.state==='unavailable');
  assert.equal(await page.locator('#hubspot-status').isVisible(),true);
  assert.equal(await page.locator('#hubspot-form').getAttribute('aria-busy'),'false');
  assert.ok(await page.locator('.hubspot-contact a[href="mailto:esl@netplanet.rs"]').isVisible());
  results.push(`${mode}: honest error and email fallback`);await page.close();
 }
 const slow=await browser.newPage();await isolateHubSpot(slow);await slow.addInitScript(()=>{window.__delayHubspotReady=true;});await slow.clock.install();await slow.goto(base+'/kontakt/');
 await slow.waitForFunction(()=>typeof window.__hubspotReady==='function');
 assert.equal(await slow.locator('#hubspot-form').getAttribute('aria-busy'),'true');
 await slow.clock.fastForward(15001);
 assert.equal(await slow.locator('#hubspot-form').getAttribute('data-state'),'unavailable');
 await slow.evaluate(()=>window.__hubspotReady());
 assert.equal(await slow.locator('#hubspot-form').getAttribute('data-state'),'ready');
 assert.equal(await slow.locator('#hubspot-status').isVisible(),false);
 results.push('Slow form: timeout fallback and late recovery');await slow.close();
 const existing=await browser.newPage();await isolateHubSpot(existing);await existing.addInitScript({content:hubspotFixture});await existing.goto(base+'/kontakt/');await existing.waitForFunction(()=>document.querySelector('#hubspot-form')?.dataset.state==='ready');
 assert.equal(await existing.locator('script[src*="js-eu1.hsforms.net"]').count(),0);results.push('Existing loader: reuse without another external script');await existing.close();
 const noJs=await browser.newPage({javaScriptEnabled:false});await isolateHubSpot(noJs);await noJs.goto(base+'/kontakt/');
 assert.equal(await noJs.locator('.hubspot-contact noscript').isVisible(),true);
 assert.equal(await noJs.locator('#hubspot-status').isVisible(),false);
 results.push('JavaScript disabled: email fallback, no endless loading status');await noJs.close();
 console.log(JSON.stringify({passed:results.length,results,externalSubmissions:0},null,2));
} finally { await browser.close(); }
