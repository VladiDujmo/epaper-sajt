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

The form sends directly through HubSpot when a visitor submits it. Fields, validation, consent options, notification recipients, and the submission confirmation remain managed in HubSpot. There is no custom submission backend or additional analytics script. The page includes a HubSpot privacy disclosure and an email fallback for blocked scripts or disabled JavaScript.

Browser QA uses a local form fixture and blocks other third-party traffic. It never submits to HubSpot. Run `npm run test:hubspot` while the preview server is running to exercise loading, failure, slow-loading recovery, and JavaScript-disabled cases. A real end-to-end submission and notification-delivery check require explicit approval and access to the receiving HubSpot account.

Private research records and source documents are not included in this repository.

