import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { generate, VARIANTS } from './scripts/variants.mjs';

// Generate hub variant pages (<slug>.html) from index.html before Vite reads inputs.
generate();

// Public origin used in canonical/OG tags. Override at build time once a custom domain exists:
//   SITE_URL=https://dropbg.app/ npx vite build
const SITE_URL = process.env.SITE_URL || 'https://dropbg.app/';

export default defineConfig({
  base: './',
  appType: 'mpa',
  server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
  preview: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
  plugins: [{
    name: 'site-url',
    transformIndexHtml(html) { return html.replaceAll('https://dropbg.app/', SITE_URL); },
    closeBundle() {
      if (SITE_URL === 'https://dropbg.app/') return;
      for (const f of ['sitemap.xml', 'robots.txt']) {
        const p = resolve(__dirname, 'dist', f);
        try { writeFileSync(p, readFileSync(p, 'utf8').replaceAll('https://dropbg.app/', SITE_URL)); } catch {}
      }
    },
  }],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        alternative: resolve(__dirname, 'remove-bg-alternative.html'),
        howto: resolve(__dirname, 'how-to-remove-background.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        ...Object.fromEntries(VARIANTS.map((v) => [v.slug, resolve(__dirname, `${v.slug}.html`)])),
      },
    },
  },
});
