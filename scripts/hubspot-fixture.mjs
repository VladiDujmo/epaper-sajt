// Local fixture only: browser QA must never create CRM contacts or send notifications.
export const hubspotLoader = 'https://js-eu1.hsforms.net/forms/embed/v2.js';
export const hubspotFixture = `
window.__hubspotCalls = [];
window.hbspt = { forms: { create(options) {
  window.__hubspotCalls.push({ portalId: options.portalId, formId: options.formId, region: options.region, target: options.target });
  const target = document.querySelector(options.target);
  target.innerHTML = '<form aria-label="Probna lokalna forma"><label for="fixture-email">Poslovni e-mail</label><input id="fixture-email" type="email" required><button type="submit" class="button">Pošaljite upit</button></form>';
  target.querySelector('form').addEventListener('submit', event => { event.preventDefault(); window.__fixtureSubmitCount = (window.__fixtureSubmitCount || 0) + 1; });
  window.__hubspotReady = options.onFormReady;
  if (!window.__delayHubspotReady) options.onFormReady();
} } };
`;
export async function isolateHubSpot(page, mode = 'ready') {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
    if (request.url() === hubspotLoader) {
      if (mode === 'blocked') return route.abort();
      if (mode === 'missing') return route.fulfill({contentType:'application/javascript',body:'/* loader failed to initialize */'});
      if (mode === 'throws') return route.fulfill({contentType:'application/javascript',body:'window.hbspt = {forms:{create(){throw new Error("fixture");}}};'});
      return route.fulfill({contentType:'application/javascript',body:hubspotFixture});
    }
    return route.abort();
  });
}
