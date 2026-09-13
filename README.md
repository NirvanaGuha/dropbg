# DropBG

Free background remover that runs entirely in the browser. No signup, no upload, no limits.

Live: https://nirvanaguha.github.io/dropbg/

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

`dist/` is a fully static site. It is published to GitHub Pages from the `gh-pages` branch:

```bash
npm run deploy
```

## Licence

This site's own code is released under the GNU AGPL-3.0. It depends on
[`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (AGPL-3.0) and
ONNX Runtime Web (MIT). The complete corresponding source for the deployed site is this repository.
Cutouts you create with the tool are yours; no licence applies to them.
