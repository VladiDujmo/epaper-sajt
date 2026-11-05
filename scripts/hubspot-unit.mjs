import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('src/components/HubSpotForm.astro','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function setup(existing=false) {
 const timers=new Map();const scripts=[];const calls=[];
 const target={dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;}};
 const status={hidden:true,textContent:''};
 const window={setTimeout(fn){timers.set(1,fn);return 1;},clearTimeout(id){timers.delete(id);}};
 const hbspt={forms:{create(options){calls.push(options);}}};
 if(existing)window.hbspt=hbspt;
 const document={querySelector(s){return s==='#hubspot-form'?target:status;},createElement(){return {attributes:{},setAttribute(k,v){this.attributes[k]=v;}};},head:{append(s){scripts.push(s);}}};
 const context=vm.createContext({window,document});
 const run=()=>vm.runInContext(`{${code}}`,context);
 run();return {target,status,window,timers,scripts,calls,hbspt,run};
}
const results=[];
let s=setup();assert.equal(s.scripts.length,1);assert.equal(s.scripts[0].src,'https://js-eu1.hsforms.net/forms/embed/v2.js');assert.equal(s.target.attributes['aria-busy'],'true');
s.window.hbspt=s.hbspt;s.scripts[0].onload();assert.equal(s.calls.length,1);const {onFormReady,...config}=s.calls[0];assert.deepEqual(JSON.parse(JSON.stringify(config)),{portalId:'25754850',formId:'64bc9124-5728-485c-bdf0-ba78b2261c29',region:'eu1',target:'#hubspot-form'});onFormReady();assert.equal(s.target.dataset.state,'ready');assert.equal(s.status.hidden,true);assert.equal(s.timers.size,0);results.push('Official loader, exact configuration and ready state');
s.run();assert.equal(s.scripts.length,1);assert.equal(s.calls.length,1);results.push('Duplicate initialization ignored');
s=setup(true);assert.equal(s.scripts.length,0);assert.equal(s.calls.length,1);results.push('Existing HubSpot loader reused');
s=setup();s.scripts[0].onerror();assert.equal(s.target.dataset.state,'unavailable');assert.equal(s.target.attributes['aria-busy'],'false');assert.match(s.status.textContent,/e-mailom/);assert.equal(s.timers.size,0);results.push('Blocked loader fallback');
s=setup();s.scripts[0].onload();assert.equal(s.target.dataset.state,'unavailable');results.push('Missing global fallback');
s=setup();s.window.hbspt={forms:{create(){throw new Error('fixture');}}};s.scripts[0].onload();assert.equal(s.target.dataset.state,'unavailable');results.push('Creation error fallback');
s=setup();s.window.hbspt=s.hbspt;s.scripts[0].onload();s.timers.get(1)();assert.equal(s.target.dataset.state,'unavailable');s.calls[0].onFormReady();assert.equal(s.target.dataset.state,'ready');assert.equal(s.status.hidden,true);results.push('Timeout and late recovery');
console.log(JSON.stringify({passed:results.length,results,externalRequests:0},null,2));
