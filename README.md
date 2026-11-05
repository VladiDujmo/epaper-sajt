# epaper.rs

Static Astro website for the existing Cloudflare Worker `epaper-sajt`.

## Local development

Use Node.js 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if needed.

## Validation

```sh
npm run check
npm run build
npm test
```

The build generates `dist/`. Generated output and `node_modules/` are not committed.

Optional browser tests:

```sh
npx playwright install chromium
npm run preview -- --port 4321
# In another terminal:
npm run test:browser
```

## Existing Cloudflare deployment

- Repository: `VladiDujmo/epaper-sajt`
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Existing Worker: `epaper-sajt`
- Worker URL: https://epaper-sajt.vladimirxdujmovic.workers.dev

`wrangler.jsonc` serves `dist/` as static assets with trailing slashes and a custom 404 page. It preserves the existing compatibility date, compatibility flag, and logging settings. No DNS or custom domain is configured here. Canonical SEO URLs remain on the intended domain `https://epaper.rs`.

## Contact form

The `/kontakt/` page embeds the HubSpot form supplied for epaper.rs:

- Region: `eu1`
- Portal: `25754850`
- Form: `64bc9124-5728-485c-bdf0-ba78b2261c29`
- Official loader: `https://js-eu1.hsforms.net/forms/embed/v2.js`

The form sends directly through HubSpot when a visitor submits it. Fields, validation, consent options, notification recipients, and the submission confirmation remain managed in HubSpot. There is no custom submission backend. GA4 is controlled separately by the analytics consent panel below. The page includes a short privacy notice linking to `/politika-privatnosti/` and an email fallback for blocked scripts or disabled JavaScript. The dedicated privacy page preserves HubSpot processing details, analytics disclosures, and the contact for data questions, correction, or deletion.

Browser QA uses a local form fixture and blocks other third-party traffic. It never submits to HubSpot. Run `npm run test:hubspot` while the preview server is running to exercise loading, failure, slow-loading recovery, and JavaScript-disabled cases. A real end-to-end submission and notification-delivery check require explicit approval and access to the receiving HubSpot account.

Private research records and source documents are not included in this repository.


## Google Analytics 4

The shared layout uses measurement ID `G-RSL6BXCYFF` only on HTTPS `epaper.rs` and `www.epaper.rs`. Local development and Worker preview URLs never load GA. The consent panel uses basic consent mode: no Google script/request until an affirmative analytics choice. Both choices are equally available; settings in the footer allow reversal. The choice expires after 180 days and is synchronized across tabs and back-forward restoration. Withdrawal disables GA, removes accessible `_ga` cookies, and reloads when necessary to discard a previously loaded third-party script.

Advertising consent remains denied and Google signals/ad personalization are disabled. The integration strips query strings/fragments from page/referrer values and adds no custom form-data tracking. HubSpot's form is separate, as disclosed on the privacy page. Verify account-side enhanced measurement, retention, and data-sharing settings in the GA administration interface before changing them.

Run `npm run test:analytics` after building for isolated runtime checks. Run `npm run test:analytics:browser` for browser checks using built local files, an intercepted production hostname, and a fake Google loader; no test data is sent to Google or HubSpot. These tests require a supported Chromium environment and do not require a local server. Existing site and HubSpot QA remain available.
