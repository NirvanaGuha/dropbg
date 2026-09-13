import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Public origin used in canonical/OG tags. Override at build time once a custom domain exists:
//   SITE_URL=https://dropbg.app/ npx vite build
const SITE_URL = process.env.SITE_URL || 'https://nirvanaguha.github.io/dropbg/';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'site-url',
    transformIndexHtml(html) { return html.replaceAll('https://dropbg.app/', SITE_URL); },
  }],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        alternative: resolve(__dirname, 'remove-bg-alternative.html'),
        howto: resolve(__dirname, 'how-to-remove-background.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
    },
  },
});
