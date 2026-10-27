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

The contact form prepares a draft in the visitor's email application; it does not send messages automatically. No email backend, analytics, or new external service is configured.

Private research records and source documents are not included in this repository.
