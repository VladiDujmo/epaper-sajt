import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
if(!fs.existsSync(root)){console.error('Prvo pokrenite npm run build.');process.exit(1);}
const routes=JSON.parse(fs.readFileSync('src/data/pages.json','utf8'));
const expected=[...Object.keys(routes),'/politika-privatnosti/'];
const errors=[];let internalLinks=0,images=0,schemas=0;const titles=new Set(),descriptions=new Set();
const assert=(condition,message)=>{if(!condition)errors.push(message)};
for(const route of expected){
 const file=path.join(root,route,'index.html');assert(fs.existsSync(file),'Nedostaje ruta: '+route);if(!fs.existsSync(file))continue;
 const html=fs.readFileSync(file,'utf8');
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1];
 assert(Boolean(title),route+' nema title');assert(!titles.has(title),route+' dupliran title');titles.add(title);
 assert(Boolean(description),route+' nema description');assert(!descriptions.has(description),route+' dupliran description');descriptions.add(description);
 assert((html.match(/<h1\b/g)||[]).length===1,route+' mora imati jedan H1');
 assert(html.includes('href="https://epaper.rs'+route+'"'),route+' canonical nije očekivan');
 assert(html.includes('lang="sr-Latn"'),route+' nedostaje jezik');
 assert(html.includes('data-analytics-consent'),route+' nema izbor analitike');
 assert(html.includes('data-analytics-settings'),route+' nema promenu izbora analitike');
 assert(!/<script[^>]+src="https:\/\/www\.googletagmanager\.com/.test(html),route+' učitava Google pre pristanka');
 const navigation=html.match(/<nav id="site-nav"[^>]*>(.*?)<\/nav>/s)?.[1]||'';
 assert((navigation.match(/class="submenu-toggle"/g)||[]).length===5,route+' mora imati pet dugmadi za podmenije');
 assert((navigation.match(/class="nav-submenu"/g)||[]).length===5,route+' mora imati pet podmenija');
 for(const dest of Object.keys(routes).filter(p=>p!=='/'))assert(navigation.includes('href="'+dest+'"'),route+' navigacija ne sadrži '+dest);
 for(let i=0;i<5;i++){assert(navigation.includes('aria-controls="nav-submenu-'+i+'"'),route+' nedostaje aria-controls');assert(navigation.includes('id="nav-submenu-'+i+'"'),route+' nedostaje kontrolisani podmeni');}

 for(const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)){try{const json=JSON.parse(m[1]);assert(json['@context']==='https://schema.org',route+' schema context');schemas++;}catch{errors.push(route+' neispravan JSON-LD')}}
 for(const m of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)){
  const target=m[1].split('?')[0];if(!target.startsWith('/')||target.startsWith('//'))continue;internalLinks++;
  const dest=path.join(root,target);assert(fs.existsSync(dest)||fs.existsSync(path.join(dest,'index.html')),route+' pokvaren lokalni link: '+target);
 }
 for(const m of html.matchAll(/<img\b[^>]*>/g)){images++;assert(/\balt="[^"]+"/.test(m[0]),route+' slika nema opis');assert(/\bwidth="\d+"/.test(m[0])&&/\bheight="\d+"/.test(m[0]),route+' slika nema dimenzije');}
 assert(!html.includes('Spatial Display'),route+' sadrži isključeni proizvod');
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');const locs=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert(locs.length===expected.length,'Sitemap mora imati sve javne rute');for(const route of expected)assert(locs.includes('https://epaper.rs'+route),'Sitemap nema '+route);
assert(!locs.some(u=>u.includes('/blog/')),'Blog ne sme biti u sitemapu');assert(!locs.some(u=>u.includes('/404/')),'404 ne sme biti u sitemapu');
assert(fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes('Sitemap: https://epaper.rs/sitemap.xml'),'robots nema sitemap');
for(const f of ['organization.jsonld','llms.txt','404.html'])assert(fs.existsSync(path.join(root,f)),'Nedostaje '+f);
try{JSON.parse(fs.readFileSync(path.join(root,'organization.jsonld'),'utf8'))}catch{errors.push('Neispravan organization.jsonld')}
const contact=fs.readFileSync(path.join(root,'kontakt/index.html'),'utf8');
assert(contact.includes('id="hubspot-form"'),'Kontakt nema HubSpot target');
assert(!contact.includes('id="inquiry-form"')&&!contact.includes('id="draft-panel"'),'Kontakt sadrži staru formu');
assert(contact.includes('href="/politika-privatnosti/"'),'Kontakt nema link ka politici privatnosti');
assert(contact.includes('Podatke iz upita koristimo radi odgovora na vaš zahtev.'),'Kontakt nema kratko obaveštenje o privatnosti');
assert(!contact.includes('Privatnost vašeg upita')&&!contact.includes('Google Analytics i vaš izbor'),'Kontakt i dalje sadrži duge odeljke privatnosti');
assert(!contact.includes('samo u vašem pregledaču')&&!contact.includes('ne koristi analitičke ni marketinške kolačiće'),'Kontakt sadrži zastarele tvrdnje o privatnosti');
assert(contact.includes('mailto:esl@netplanet.rs'),'Kontakt nema e-mail alternativu');
const privacy=fs.readFileSync(path.join(root,'politika-privatnosti/index.html'),'utf8');
assert(privacy.includes('id="privatnost"')&&privacy.includes('https://legal.hubspot.com/privacy-policy'),'Politika nema HubSpot privatnost');
assert(privacy.includes('id="google-analytics"')&&privacy.includes('https://policies.google.com/privacy'),'Politika nema privatnost analitike');
const analyticsDisclosure=privacy.match(/<section[^>]+id="google-analytics"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
assert((analyticsDisclosure.match(/<p\b/g)||[]).length===1,'GA obaveštenje mora biti sažeto u jedan pasus');
assert(analyticsDisclosure.includes('Uz vašu saglasnost koristimo Google Analytics radi analize posećenosti i poboljšanja sajta.'),'GA nema odobreni sažeti tekst');
assert(analyticsDisclosure.includes('mailto:esl@netplanet.rs'),'GA obaveštenje nema kontakt');
assert(privacy.includes('id="vasa-prava"')&&privacy.includes('ispravci ili brisanju'),'Politika nema prava i kontakt');
assert(!privacy.includes('id="hubspot-form"'),'Politika ne sme učitavati HubSpot formu');
for(const route of expected){
 const html=fs.readFileSync(path.join(root,route,'index.html'),'utf8');
 assert(html.includes('href="/politika-privatnosti/"'),route+' nema novi link politike');
 assert(html.includes('href="/politika-privatnosti/#google-analytics"'),route+' nema novi link analitike');
 assert(!html.includes('href="/kontakt/#privatnost"')&&!html.includes('href="/kontakt/#google-analytics"'),route+' sadrži stare linkove privatnosti');
}
const report={routes:expected.length,internalLinksChecked:internalLinks,imagesChecked:images,jsonLdBlocks:schemas,sitemapRoutes:locs.length,errors};
console.log(JSON.stringify(report,null,2));if(errors.length)process.exit(1);

