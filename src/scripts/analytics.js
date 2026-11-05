// Basic consent mode: no Google Analytics request is made before an affirmative choice.
// Advertising stays denied. This choice controls GA4, not the separately disclosed HubSpot contact form.
(() => {
  const measurementId = 'G-RSL6BXCYFF';
  const storageKey = 'epaper-analytics-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const banner = document.querySelector('[data-analytics-consent]');
  const settings = document.querySelector('[data-analytics-settings]');
  const close = document.querySelector('[data-analytics-close]');
  const title = document.getElementById('analytics-consent-title');
  if (!banner || !settings || !close) return;
  const production = location.protocol === 'https:' && ['epaper.rs', 'www.epaper.rs'].includes(location.hostname);
  let loaded = false;
  let expiresAt = 0;
  let expiryTimer;
  let returnFocus;
  const now = () => Date.now();
  const readChoice = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && ['granted', 'denied'].includes(saved.choice) && Number.isFinite(saved.expiresAt) && saved.expiresAt > now() && saved.expiresAt <= now() + lifetime) {
        expiresAt = saved.expiresAt;
        return saved.choice;
      }
    } catch { /* Storage may be unavailable: ask again rather than infer permission. */ }
    expiresAt = 0;
    return null;
  };
  let choice = readChoice();
  function clearAnalyticsCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (name !== '_ga' && !name.startsWith('_ga_')) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname, 'epaper.rs', '.epaper.rs']) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? '; domain=' + domain : ''}`;
      }
    }
  }
  function cleanUrl(value) {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.origin + url.pathname : ''; }
    catch { return ''; }
  }
  function startAnalytics() {
    if (!production || loaded || choice !== 'granted') return;
    loaded = true;
    window['ga-disable-' + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Do not send query strings/hash fragments or cross-domain link decoration.
      page_location: cleanUrl(location.href),
      page_referrer: cleanUrl(document.referrer),
      cookie_expires: 180 * 24 * 60 * 60,
      cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure'
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    script.referrerPolicy = 'no-referrer';
    script.id = 'epaper-ga4';
    document.head.appendChild(script);
  }
  function stopAnalytics() {
    window['ga-disable-' + measurementId] = true;
    clearAnalyticsCookies();
    // A loaded third-party script cannot be unloaded. Reload with the denied/expired choice.
    if (loaded && readChoice() !== 'granted') location.reload();
  }
  function render(open = choice === null) {
    banner.hidden = !open;
    close.hidden = choice === null;
    settings.hidden = false;
    settings.setAttribute('aria-expanded', String(open));
  }
  function restoreFocus() {
    // Moving focus must never scroll the visitor away from their current content.
    if (returnFocus) returnFocus.focus({ preventScroll: true });
    else if (banner.contains(document.activeElement)) settings.focus({ preventScroll: true });
    returnFocus = null;
  }
  function expireIfNeeded() {
    if (choice !== null && expiresAt <= now()) {
      choice = null;
      try { localStorage.removeItem(storageKey); } catch { /* No persistent choice. */ }
      stopAnalytics();
      render(true);
    }
  }
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if (choice === null) return;
    expiryTimer = setTimeout(() => { expireIfNeeded(); scheduleExpiry(); }, Math.max(1, Math.min(expiresAt - now(), 2147483647)));
  }
  document.querySelectorAll('[data-analytics-choice]').forEach(button => {
    button.addEventListener('click', () => {
      choice = button.dataset.analyticsChoice;
      expiresAt = now() + lifetime;
      try { localStorage.setItem(storageKey, JSON.stringify({ choice, expiresAt })); } catch {
        // A quota/privacy error must not leave an earlier opt-in active after withdrawal.
        try { localStorage.removeItem(storageKey); } catch { /* Keep collection disabled on this page if storage is locked. */ }
      }
      if (choice === 'granted') startAnalytics();
      else stopAnalytics();
      restoreFocus();
      render(false);
      scheduleExpiry();
    });
  });
  settings.addEventListener('click', () => {
    expireIfNeeded();
    returnFocus = settings;
    render(true);
    title?.focus({ preventScroll: true });
  });
  close.addEventListener('click', () => { if (choice !== null) { restoreFocus(); render(false); } });
  banner.addEventListener('keydown', event => {
    if (event.key === 'Escape' && choice !== null) { restoreFocus(); render(false); }
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    choice = readChoice();
    if (choice === 'granted') startAnalytics();
    else stopAnalytics();
    render();
    scheduleExpiry();
  });
  window.addEventListener('pageshow', () => {
    // Recheck permissions when returning through the browser's back-forward cache.
    choice = readChoice();
    if (choice === 'granted') startAnalytics();
    else stopAnalytics();
    render();
    scheduleExpiry();
  });
  document.addEventListener('visibilitychange', expireIfNeeded);
  if (choice === 'granted') startAnalytics();
  else stopAnalytics();
  render();
  scheduleExpiry();
})();
