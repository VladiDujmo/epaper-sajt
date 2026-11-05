/** Runs the actual built analytics script against isolated browser doubles. No network. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const code = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('G-RSL6BXCYFF'));
assert.ok(code, 'Built production script must exist');
let checks = 1;
const ok = (condition, label) => { checks++; assert.ok(condition, label); };
class Element {
  constructor() { this.hidden = true; this.listeners = {}; this.dataset = {}; this.attrs = {}; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  setAttribute(key, value) { this.attrs[key] = value; }
  focus(options) { this.focused = true; this.focusOptions = options; }
  contains(node) { return node === this || (this.children || []).includes(node); }
  emit(type, event = {}) { this.listeners[type]?.(event); }
}
const key = 'epaper-analytics-consent-v1';
const duration = 180 * 24 * 60 * 60 * 1000;
function setup({ saved = null, host = 'epaper.rs', blocked = false, writeBlocked = false, url = null } = {}) {
  let time = 1800000000000;
  class DateMock extends Date { static now() { return time; } }
  const banner = new Element(), settings = new Element(), close = new Element(), title = new Element();
  const accept = new Element(), reject = new Element();
  accept.dataset.analyticsChoice = 'granted'; reject.dataset.analyticsChoice = 'denied';
  banner.children = [accept, reject, close, title];
  const appended = [], deleted = [], data = new Map(), timers = new Map();
  if (saved) data.set(key, typeof saved === 'string' ? saved : JSON.stringify({ choice: saved.choice, expiresAt: time + (saved.remaining ?? duration) }));
  const document = new Element(), window = new Element();
  const location = new URL(url || `https://${host}/kontakt/?tema=private#fragment`);
  let reloads = 0;
  location.reload = () => { reloads++; };
  document.referrer = 'https://search.example/path?q=private#fragment';
  document.querySelector = selector => ({ '[data-analytics-consent]': banner, '[data-analytics-settings]': settings, '[data-analytics-close]': close })[selector];
  document.querySelectorAll = () => [accept, reject];
  document.getElementById = () => title;
  document.createElement = () => ({});
  document.head = { appendChild: el => appended.push(el) };
  Object.defineProperty(document, 'cookie', { get: () => '_ga=old; _ga_RSL6BXCYFF=old; necessary=keep', set: val => deleted.push(val) });
  const localStorage = { getItem: k => { if (blocked) throw Error(); return data.get(k); }, setItem: (k,v) => { if (blocked || writeBlocked) throw Error(); data.set(k,v); }, removeItem: k => data.delete(k) };
  let timerId = 0;
  const context = { document, window, location, localStorage, URL, Date: DateMock, setTimeout: (fn,ms) => { const id = ++timerId; timers.set(id,{fn,ms}); return id; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(code, context);
  return { banner, settings, close, title, accept, reject, document, window, appended, deleted, data, timers, advance: ms => { time += ms; }, reloads: () => reloads };
}
let s = setup();
ok(!s.banner.hidden && !s.settings.hidden && s.close.hidden, 'New visitor sees both choices and settings');
ok(s.appended.length === 0 && !s.window.dataLayer, 'No GA script or queued analytics before consent');
ok(s.deleted.every(c => c.startsWith('_ga')), 'Only GA cookies are removed without consent');
s.reject.emit('click');
ok(s.banner.hidden && s.appended.length === 0, 'Reject closes banner without loading GA');
ok(JSON.parse(s.data.get(key)).choice === 'denied', 'Denial is persisted');
s.settings.emit('click');
ok(!s.banner.hidden && !s.close.hidden && s.title.focused, 'Settings reopens and focuses heading');
s.close.emit('click');
ok(s.banner.hidden && s.settings.focused, 'Close restores focus without changing choice');
s.settings.emit('click');s.banner.emit('keydown', { key: 'Escape' });
ok(s.banner.hidden && JSON.parse(s.data.get(key)).choice === 'denied', 'Escape preserves recorded choice');
s.settings.emit('click');s.accept.emit('click');
ok(s.appended.length === 1 && s.appended[0].src.endsWith('id=G-RSL6BXCYFF') && s.appended[0].async, 'Acceptance loads correct async GA4 tag');
ok(s.appended[0].referrerPolicy === 'no-referrer', 'Script does not leak page URL in referrer header');
const commands = s.window.dataLayer.map(args => Array.from(args));
const defaults = commands.find(a => a[0] === 'consent' && a[1] === 'default')[2];
ok(defaults.analytics_storage === 'denied' && defaults.ad_storage === 'denied' && defaults.ad_user_data === 'denied' && defaults.ad_personalization === 'denied', 'Consent defaults deny all categories');
const update = commands.find(a => a[0] === 'consent' && a[1] === 'update')[2];
ok(update.analytics_storage === 'granted' && Object.keys(update).length === 1, 'Only analytics is granted');
const config = commands.find(a => a[0] === 'config')[2];
ok(config.allow_google_signals === false && config.allow_ad_personalization_signals === false, 'Advertising features disabled');
ok(config.page_location === 'https://epaper.rs/kontakt/' && config.page_referrer === 'https://search.example/path', 'Query strings and fragments stripped from page/referrer');
ok(config.cookie_expires === duration / 1000 && config.cookie_update === false, 'Cookies bounded to 180 days without automatic renewal');
s.accept.emit('click');s.window.emit('pageshow');
ok(s.appended.length === 1 && s.window.dataLayer.filter(a => a[0] === 'config').length === 1, 'Repeat accept/pageshow do not duplicate tag/pageview');
s.reject.emit('click');
ok(s.window['ga-disable-G-RSL6BXCYFF'] === true && s.reloads() === 1, 'Withdrawal disables collection and reloads');
ok(s.deleted.some(c => c.includes('domain=.epaper.rs')) && JSON.parse(s.data.get(key)).choice === 'denied', 'Withdrawal clears domain cookies and saves rejection');
for (const choice of ['denied', 'granted']) {
  s = setup({ saved: { choice } });
  ok(s.banner.hidden && s.appended.length === (choice === 'granted' ? 1 : 0), `Remembered ${choice} is respected`);
}
for (const saved of ['bad json', { choice: 'unknown' }, { choice: 'granted', remaining: -1 }, { choice: 'granted', remaining: duration + 100 }]) {
  s = setup({ saved });
  ok(!s.banner.hidden && s.appended.length === 0, 'Invalid/expired/impossibly long choice never enables GA');
}
for (const host of ['localhost', '127.0.0.1', 'preview.workers.dev', 'epaper.rs.attacker.test']) {
  s = setup({ host, saved: { choice: 'granted' } });
  ok(s.appended.length === 0, `Non-production ${host} never loads GA`);
}
s = setup({ host: 'www.epaper.rs', saved: { choice: 'granted' } });
ok(s.appended.length === 1, 'Authorized www production hostname loads GA');
s = setup({ url: 'http://epaper.rs/', saved: { choice: 'granted' } });
ok(s.appended.length === 0, 'HTTP cannot set secure analytics cookies');
s = setup({ blocked: true });s.accept.emit('click');
ok(s.appended.length === 1 && s.banner.hidden, 'Unavailable storage still permits explicit choice for current page');
s = setup({ saved: { choice: 'granted', remaining: 1000 } });s.advance(1001);s.document.emit('visibilitychange');
ok(s.reloads() === 1 && !s.banner.hidden && !s.data.has(key), 'Consent expiry disables analytics and asks again');
s = setup({ saved: { choice: 'granted' } });s.data.set(key, JSON.stringify({ choice: 'denied', expiresAt: 1800000001000 }));s.window.emit('storage', { key });
ok(s.reloads() === 1 && s.window['ga-disable-G-RSL6BXCYFF'], 'Cross-tab rejection stops active analytics');
s = setup();s.data.set(key, JSON.stringify({ choice: 'granted', expiresAt: 1800000001000 }));s.window.emit('storage', { key });
ok(s.appended.length === 1 && s.banner.hidden, 'Cross-tab acceptance applies once');
s = setup({ saved: { choice: 'granted' } });s.data.clear();s.window.emit('pageshow');
ok(s.reloads() === 1 && !s.banner.hidden, 'Back-forward restoration rechecks consent');
s = setup();s.banner.emit('keydown', { key: 'Escape' });
ok(!s.banner.hidden && s.appended.length === 0, 'Escape without a choice does not imply consent');
s = setup({ saved: { choice: 'granted' }, writeBlocked: true });s.reject.emit('click');
ok(s.reloads() === 1 && !s.data.has(key) && s.window['ga-disable-G-RSL6BXCYFF'], 'Failed choice write removes old opt-in before reload');
// Regression: accepting/rejecting a fixed banner must not scroll to footer focus.
for (const action of ['accept', 'reject']) {
  s = setup(); s.document.activeElement = s[action]; s[action].emit('click');
  ok(s.settings.focused && s.settings.focusOptions?.preventScroll === true, `${action} restores focus without scrolling to footer`);
  ok(s.banner.hidden, `${action} still dismisses the banner`);
}
for (const action of ['accept', 'reject', 'close', 'escape']) {
  s = setup({ saved: { choice: 'denied' } }); s.settings.emit('click');
  ok(s.title.focusOptions?.preventScroll === true, 'Reopening settings preserves scroll position');
  if (action === 'escape') s.banner.emit('keydown', { key: 'Escape' });
  else s[action].emit('click');
  ok(s.settings.focusOptions?.preventScroll === true, `${action} in reopened settings returns focus without scrolling`);
}
console.log(`PASS: ${checks} analytics consent checks against built JavaScript. No network requests.`);
