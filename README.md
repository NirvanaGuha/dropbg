# DropBG

Free background remover that runs entirely in the browser. No signup, no upload, no limits.

Live: https://dropbg.app/ (Cloudflare Pages, production; also dropbg-d5d.pages.dev)
Mirror: https://nirvanaguha.github.io/dropbg/ (GitHub Pages, canonicals point at dropbg.app)

## How it works

Images are segmented on the user's device. Desktop browsers with WebGPU run BiRefNet_lite (MIT) through
Transformers.js, using the graph-patched export `jiabins0303/birefnet-lite-1024-webgpu` (the stock export exceeds
ORT's WebGPU storage-buffer limit). Phones and Safari run our own BiRefNet_lite re-export at 640 px (fp16 weights, 88 MB) on multi-threaded
WebAssembly, served from https://github.com/NirvanaGuha/dropbg-models (Cloudflare Pages caps files at 25 MiB);
see `tools/quant/` for the export pipeline. IS-Net via `@imgly/background-removal` remains only as an automatic
fallback if BiRefNet fails to load or run. See `src/engine.js`.
Debug flags: `?engine=isnet|birefnet`, `?device=cpu|gpu`, `?model=isnet|isnet_fp16|isnet_quint8`. No image data is sent to any server. The model
files are fetched once from a CDN and cached by the browser.

## Develop

```bash
npm install
npx vite            # dev server
npx vite build      # static output in dist/
SITE_URL=https://example.com/ npx vite build   # set canonical/OG origin for a custom domain
```

## Deploy

`dist/` is a fully static site.

Production is Cloudflare Pages (project `dropbg`, unlimited bandwidth, custom domains). Requires a one-time `npx wrangler login`:

```bash
npm run deploy:cf                                   # canonical origin = https://dropbg.app/
SITE_URL=https://other.example/ npm run deploy:cf   # override the origin if ever needed
```

A GitHub Pages mirror is published from the `gh-pages` branch with `npm run deploy:gh`.

## Pro unlock ($19 one-time)

Pro adds batch .zip download, HD Refine (server-side BiRefNet pass, capped at 300/month per key) and a commercial licence with priority support. The site runs no ads by decision (see research/PRICING-REVIEW-2026-09-13.md). Pro is dormant until configured:
the Pro nav link, pricing section and batch bar stay hidden while `.env` is blank.

1. **Polar.sh**: create an organisation, then a one-time product "DropBG Pro" at **$19** with a *License Keys* benefit. Also create a **discount code** that brings it to $9 for waitlist members (founder's price, no expiry) and send it with the launch email
   (no activation limit, or e.g. 5 activations). Create a Checkout Link for it.
   Copy the organisation id (Settings → General) and the checkout link into `.env`:
   `VITE_POLAR_ORG_ID`, `VITE_POLAR_CHECKOUT_URL`.
2. **Worker** (`worker/`): set the same org id in `wrangler.toml` `[vars] POLAR_ORG_ID`, then
   `cd worker && npx wrangler secret put REPLICATE_API_TOKEN` (token from replicate.com/account/api-tokens)
   and `npx wrangler deploy`. `VITE_API_BASE` in `.env` is the worker URL (already set).
   `GET /health` on the worker reports `refine: true` once the token is in place.
3. `npm run deploy:cf`.

Keys are validated client-side against Polar's public validate endpoint (cached 7 days in localStorage) and
again server-side by the worker before every HD Refine, which also increments the key's usage counter in Polar.
Local testing without a Polar account: put dummy values in `.env.development.local` and open `/?pro=dev`
(dev builds only; compiled out of production).

## Licence

This site's own code is released under the GNU AGPL-3.0 while it still bundles
[`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (AGPL-3.0) as a fallback engine.
Both primary paths use BiRefNet_lite (MIT) via Transformers.js (Apache-2.0) and ONNX Runtime Web (MIT).
Removing the fallback would allow relicensing to MIT. The complete corresponding source for the deployed site is this repository.
Cutouts you create with the tool are yours; no licence applies to them.
