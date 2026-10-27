import {chromium} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://localhost:4321';
const output=process.env.QA_OUTPUT||'qa';fs.mkdirSync(output,{recursive:true});
const pages=JSON.parse(fs.readFileSync('src/data/pages.json','utf8'));const report={pages:[],interaction:[],errors:[]};
for(const size of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
 const page=await browser.newPage({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
 page.on('pageerror',error=>report.errors.push(String(error)));
 for(const route of Object.keys(pages)){
  const response=await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),h1:document.querySelector('h1')?.textContent}));
  if(response?.status()!==200||state.overflow||state.images.length)report.errors.push({route,viewport:size.name,status:response?.status(),...state});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const axe=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  report.pages.push({route,viewport:size.name,status:response?.status(),overflow:state.overflow,axeViolations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
  if(axe.violations.length)report.errors.push({route,viewport:size.name,axe:axe.violations.map(v=>v.id)});
  if(['/','/proizvodi/samsung-color-e-paper/13-incha/','/resenja/digitalni-meniji/','/kontakt/'].includes(route))await page.screenshot({path:output+'/'+size.name+'-'+(route==='/'?'home':route.split('/').filter(Boolean).at(-1))+'.png',fullPage:true});
 }
 await page.goto(base+'/');
 if(size.name==='mobile'){
  const menu=page.getByRole('button',{name:'Otvori navigaciju'});await menu.click();if(await menu.getAttribute('aria-expanded')!=='true')report.errors.push('Mobile menu did not open');await page.keyboard.press('Escape');if(await menu.getAttribute('aria-expanded')!=='false')report.errors.push('Mobile menu did not close with Escape');await menu.click();await page.locator('#site-nav').getByRole('link',{name:'Proizvodi',exact:true}).click();if(!page.url().endsWith('/proizvodi/'))report.errors.push('Menu navigation failed');report.interaction.push('Mobile menu open, Escape, reopen and navigation passed');
 }
 await page.goto(base+'/');
 if(size.name==='mobile')await page.getByRole('button',{name:'Otvori navigaciju'}).click();
 const toggles=page.locator('.submenu-toggle');
 for(let i=0;i<5;i++){
  await toggles.nth(i).click();
  if(await toggles.nth(i).getAttribute('aria-expanded')!=='true')report.errors.push(size.name+' disclosure failed '+i);
  if(await page.locator('.submenu-toggle[aria-expanded="true"]').count()!==1)report.errors.push(size.name+' multiple disclosures open');
  const panel=page.locator('#nav-submenu-'+i);if(!(await panel.isVisible()))report.errors.push(size.name+' hidden open panel '+i);
  await page.keyboard.press('Escape');if(await toggles.nth(i).getAttribute('aria-expanded')!=='false')report.errors.push(size.name+' Escape failed '+i);
 }
 await toggles.nth(1).focus();await page.keyboard.press('ArrowDown');
 if(!(await page.locator('#nav-submenu-1 a').first().evaluate(el=>el===document.activeElement)))report.errors.push(size.name+' ArrowDown focus failed');
 await page.keyboard.press('End');if(!(await page.locator('#nav-submenu-1 a').last().evaluate(el=>el===document.activeElement)))report.errors.push(size.name+' End key failed');
 await page.keyboard.press('Escape');await toggles.nth(1).click();
 await page.mouse.click(size.width-1,size.height-1);if(await toggles.nth(1).getAttribute('aria-expanded')!=='false')report.errors.push(size.name+' outside click failed');
 if(size.name==='mobile')await page.getByRole('button',{name:'Otvori navigaciju'}).click();
 await toggles.nth(1).click();await page.locator('#nav-submenu-1').getByRole('link',{name:'Samsung Color E-Paper 13″',exact:false}).click();
 if(!page.url().endsWith('/13-incha/'))report.errors.push(size.name+' submenu navigation failed');
 await page.goBack();await page.goForward();if(!page.url().endsWith('/13-incha/'))report.errors.push(size.name+' back/forward failed');
 report.interaction.push(size.name+' all five disclosures, Escape, keyboard arrows, End, outside click, subpage link and back/forward checked');
 await page.goto(base+'/resenja/digitalni-meniji/');const detail=page.locator('details').first();await detail.locator('summary').click();if(!(await detail.getAttribute('open'))&&await detail.getAttribute('open')!== '')report.errors.push('FAQ failed open');await detail.locator('summary').click();if(await detail.getAttribute('open')!==null)report.errors.push('FAQ failed close');report.interaction.push(size.name+' FAQ repeated toggle passed');
 await page.goto(base+'/kontakt/');await page.locator('#company').fill('Test d.o.o.');await page.locator('#email').fill('test@example.com');await page.locator('#phone').fill('+381 60 1234567');await page.locator('#message').fill('Test lokalnog nacrta.');await page.locator('button[type=submit]').click();if(!(await page.locator('#draft-panel').isVisible()))report.errors.push('Draft panel not visible');if(!(await page.locator('#draft').inputValue()).includes('Test d.o.o.'))report.errors.push('Draft missing input');if(!(await page.locator('#form-status').textContent()).includes('još nije poslat'))report.errors.push('Draft status misleading');report.interaction.push(size.name+' form local draft and honest not-sent status passed; no email sent');
 await page.close();
}
await browser.close();fs.writeFileSync(output+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pages:report.pages.length,interaction:report.interaction,errors:report.errors},null,2));if(report.errors.length)process.exit(1);
