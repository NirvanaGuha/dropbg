# DropBG

Free background remover that runs entirely in the browser. No signup, no upload, no limits.

Live: https://dropbg.app/ (Cloudflare Pages, production; also dropbg-d5d.pages.dev)
Mirror: https://nirvanaguha.github.io/dropbg/ (GitHub Pages, canonicals point at dropbg.app)

## How it works

Images are segmented on the user's device with an IS-Net model executed by ONNX Runtime Web
(WebGPU where available, WebAssembly otherwise). No image data is sent to any server. The model
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

## Licence

This site's own code is released under the GNU AGPL-3.0. It depends on
[`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (AGPL-3.0) and
ONNX Runtime Web (MIT). The complete corresponding source for the deployed site is this repository.
Cutouts you create with the tool are yours; no licence applies to them.
