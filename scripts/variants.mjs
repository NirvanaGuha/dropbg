// Hub variant pages: one engine (index.html) rendered with per-use-case copy, FAQ, schema and preset.
// Run by vite.config.js at startup; writes <slug>.html to the project root and public/sitemap.xml.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://dropbg.app/'; // replaced at build by the site-url plugin

const SHARED_FAQ = [
  ['Is this really free?', 'Yes. No credits, no watermark, no daily cap, no account, and no ads. The remover runs on your own device, so giving it away costs us nothing. An optional one-time Pro unlock pays for the site.'],
  ['Is my image uploaded anywhere?', 'No. The AI model downloads to your browser once and every image is processed on your own device. Open your browser\'s network tab while you use it: you will see the model download and nothing else.'],
];

export const VARIANTS = [
  {
    slug: 'transparent-background-maker',
    card: ['Transparent background maker', 'Any image to a clean transparent PNG'],
    title: 'Transparent Background Maker – Free, No Signup, Runs in Your Browser',
    description: 'Make any image background transparent in seconds. Free transparent background maker that runs on your device: no upload, no signup, no watermark, full-resolution PNG.',
    pill: 'Transparent PNG out. Nothing uploaded.',
    h1: 'Make any image background <em>transparent.</em>',
    lede: 'Drop a JPG, PNG or WebP and get the subject on a real alpha channel. Full resolution, no watermark, and the file never leaves your computer.',
    preset: null,
    content: `
      <h2>How to make an image transparent</h2>
      <ol>
        <li>Drop the image above, or paste it from your clipboard.</li>
        <li>Wait a second or two. The checkerboard behind the subject is the transparent area.</li>
        <li>Drag the slider to compare with the original, then click <em>Download PNG</em>.</li>
      </ol>
      <p>The output is a PNG with a true alpha channel, so it drops onto any background in Slides, Canva, Figma, Word or a website without a white box around it. JPG cannot store transparency, which is why the result is always a PNG.</p>
      <h3>Where a transparent image is useful</h3>
      <ul>
        <li>Product cutouts for listings, ads and collages.</li>
        <li>Headshots on a brand colour for team pages and slides.</li>
        <li>Stickers, memes and thumbnails.</li>
        <li>Icons and illustrations scanned from paper.</li>
      </ul>
      <div class="tip"><p><strong>Tip.</strong> Transparency is only visible on a checkerboard or a coloured background. If the download looks like it has a white background in a preview app, open it over a dark colour to see the real edges.</p></div>`,
    faq: [
      ['Why does my transparent image look white in some apps?', 'Some image viewers paint transparent pixels white or black. Drop the PNG onto a coloured slide or use the colour swatches above to preview it on a different background before you download.'],
      ['Can I make a GIF or JPG transparent?', 'You can load a JPG or a single GIF frame, but the result is saved as a PNG because JPG has no transparency channel and GIF only supports hard one-bit transparency, which ruins hair and soft edges.'],
      ['Does it keep the original resolution?', 'Yes. The PNG is the same pixel size as the image you dropped in. There is no free-tier downscale.'],
    ],
  },
  {
    slug: 'png-maker',
    card: ['PNG maker', 'Photo to transparent PNG, one step'],
    title: 'Transparent PNG Maker – Turn Any Photo Into a PNG With No Background',
    description: 'Free PNG maker: convert any JPG, WebP or HEIC photo into a transparent PNG with the background removed. Runs in your browser, no upload, no signup, no watermark.',
    pill: 'Photo in, transparent PNG out.',
    h1: 'Turn any photo into a <em>transparent PNG.</em>',
    lede: 'Convert and cut out in one step. Drop a JPG or WebP, get a PNG with the background gone, at the original resolution, without the file leaving your device.',
    preset: null,
    content: `
      <h2>Why "PNG" usually means "transparent"</h2>
      <p>When people search for a PNG maker they almost always want one of two things: a file that keeps transparency, or an image with the background already removed so it can sit on anything. This tool does both at once. It removes the background with an on-device AI model and saves the result as a PNG with an alpha channel.</p>
      <h3>Formats it accepts</h3>
      <ul>
        <li><strong>JPG / JPEG</strong>, the common photo format with no transparency support.</li>
        <li><strong>WebP</strong>, including files saved from websites.</li>
        <li><strong>PNG</strong>, if you want to remove a background that is already baked in.</li>
        <li><strong>HEIC</strong> on Safari and recent Chrome, straight from an iPhone.</li>
      </ul>
      <h3>If you only want to convert, not cut out</h3>
      <p>Pick the white swatch before downloading. You get a flat PNG with a plain white background, which is a straight format conversion with a clean background thrown in.</p>
      <div class="tip"><p><strong>Tip.</strong> PNG files are larger than JPGs because they are lossless. A 4000 px product photo can be 8 to 15 MB as a transparent PNG. That is normal, and it is the format marketplaces and design tools expect.</p></div>`,
    faq: [
      ['Does the PNG maker reduce quality?', 'No. PNG is lossless, so the pixels you keep are identical to the original. The only change is that background pixels become transparent.'],
      ['Can I make a PNG with a solid colour instead of transparency?', 'Yes. Choose white, black, a preset or a custom colour from the swatches under the result. The download is still a PNG, just without transparency.'],
      ['Is there a file size limit?', 'There is no upload, so there is no upload limit. Very large images, above roughly 30 megapixels, may be slow on phones because the work happens on your device.'],
    ],
  },
  {
    slug: 'remove-background-from-logo',
    card: ['Logo background remover', 'Kill the white box behind a logo'],
    title: 'Remove Background From a Logo – Free Transparent Logo Maker',
    description: 'Remove the white or coloured background from a logo and download a transparent PNG. Free, runs in your browser, no upload, no signup, full resolution.',
    pill: 'Logos and marks. Nothing uploaded.',
    h1: 'Remove the background <em>from a logo.</em>',
    lede: 'Got a logo as a JPG with a white box around it? Drop it in and get a transparent PNG you can place on any colour, slide or website header.',
    preset: null,
    content: `
      <h2>Getting a clean logo cutout</h2>
      <ol>
        <li>Use the largest version of the logo you have. A 2000 px file gives cleaner edges than a 300 px thumbnail pulled from a website.</li>
        <li>Drop it above. Flat shapes and text on a plain background come out very clean.</li>
        <li>Check thin strokes and small text with the compare slider, then download.</li>
      </ol>
      <h3>When to ask for the original instead</h3>
      <p>A logo that exists as a vector file (SVG, AI, EPS or PDF) is infinitely scalable and already has no background. If you can get that file from the designer or the brand's press page, use it. This tool is for the common case where all you have is a flattened JPG or PNG.</p>
      <h3>Tricky logos</h3>
      <ul>
        <li><strong>White logos on white.</strong> Invert the colours first in any editor, remove the background, then invert back.</li>
        <li><strong>Gradients and glows.</strong> Soft edges are kept as partial transparency, which is what you want.</li>
        <li><strong>Logos with a background that is part of the design.</strong> The model keeps the most salient shape. If it removes a shape you wanted, place the result over the original colour using the custom swatch.</li>
      </ul>
      <div class="tip"><p><strong>Tip.</strong> Company logos are trademarks. Removing a background for your own presentation or a partner page is normal use; check brand guidelines before altering colours or proportions.</p></div>`,
    faq: [
      ['Will text in the logo stay sharp?', 'Yes, at the resolution you provide. The tool does not redraw anything, it only makes background pixels transparent, so edges are as sharp as the source.'],
      ['Can I change the background to my brand colour?', 'Yes. Use the rainbow swatch under the result to pick any colour, then download. For transparency, keep the checkerboard swatch selected.'],
      ['Can it vectorise the logo?', 'No. The output is a PNG bitmap. For a vector, trace the PNG in Illustrator, Inkscape or Figma, or ask the brand for the original file.'],
    ],
  },
  {
    slug: 'remove-background-from-signature',
    card: ['Signature background remover', 'Paper photo to transparent signature'],
    title: 'Remove Background From a Signature – Transparent Signature PNG, Private',
    description: 'Photograph your signature on paper and get a transparent PNG for PDFs, contracts and email. Free and private: the image never leaves your device.',
    pill: 'Your signature never leaves your device.',
    h1: 'Make your signature <em>transparent.</em>',
    lede: 'Sign on paper, take a photo, drop it here. You get a clean transparent PNG for contracts, PDFs and email signatures, and because the AI runs in your browser, your signature is never uploaded anywhere.',
    preset: null,
    content: `
      <h2>How to capture a signature that cuts out cleanly</h2>
      <ol>
        <li>Sign with a black or dark blue pen on plain white paper. Felt tip or gel pens give the strongest line.</li>
        <li>Photograph it in daylight or under an even lamp, straight on, with no shadow from your hand or phone.</li>
        <li>Crop to the signature before dropping it in. Less paper means the model concentrates on the ink.</li>
        <li>Drop it above, check the thin strokes with the slider, and download the PNG.</li>
      </ol>
      <h3>Why this page exists</h3>
      <p>A signature is one of the few images you genuinely should not upload to a random website. Every other signature tool sends your photo to a server. DropBG runs the model on your device, so the image is processed and discarded in your browser's memory. You can confirm this with the network tab in developer tools.</p>
      <h3>Using the result</h3>
      <ul>
        <li><strong>PDFs.</strong> Insert the PNG as an image in Preview, Acrobat or any PDF editor. Transparency lets it sit on the signature line without a white box.</li>
        <li><strong>Email.</strong> Add it to your signature block at roughly 150 to 200 px wide.</li>
        <li><strong>Documents.</strong> In Word or Google Docs, insert the image and set text wrapping to "in front of text".</li>
      </ul>
      <div class="tip"><p><strong>Tip.</strong> If the strokes look thin or broken, re-photograph with a thicker pen rather than trying to fix the cutout. The model keeps what it sees; it cannot thicken ink.</p></div>`,
    faq: [
      ['Is it safe to use for a legal signature?', 'The image never leaves your device, so it is as private as a tool can be. Whether a pasted image counts as a legal signature depends on the document and jurisdiction; e-signature services exist for the cases where it matters.'],
      ['Can it remove the lined paper or notebook lines?', 'Faint lines usually go. Dark ruled lines that touch the signature may be kept where they cross the ink. Plain white paper avoids the problem.'],
      ['Can I make the signature blue or another colour?', 'Not here. The tool keeps the original ink colour. Any image editor can recolour the transparent PNG afterwards.'],
    ],
  },
  {
    slug: 'white-background-maker',
    card: ['White background maker', 'Product photos on pure white'],
    title: 'White Background Maker for Product Photos – Free, Pure White 255,255,255',
    description: 'Put any product photo on a pure white background for Amazon, Etsy, eBay and Shopify. Free, full resolution, runs in your browser with no upload.',
    pill: 'Preset: pure white, RGB 255 255 255.',
    h1: 'Put your product on a <em>pure white background.</em>',
    lede: 'Drop a product photo and download it on true white, the colour marketplaces require for main images. The white is preset for you, and your photos are processed on your own device.',
    preset: { bg: '#ffffff' },
    content: `
      <h2>Why "pure white" matters for listings</h2>
      <p>Amazon requires main images on a pure white background, RGB 255, 255, 255. Etsy, eBay and Google Shopping recommend the same. A photo shot against a white wall is almost never pure white; it is grey, cream or blue-tinted. This page removes the original background and composites the product onto exact white, so the listing background matches the page.</p>
      <h3>Steps</h3>
      <ol>
        <li>Drop the product photo above. The white swatch is already selected on this page.</li>
        <li>Check edges on the compare slider, especially reflective or glass items.</li>
        <li>Download the PNG. It is a flat white image with no transparency, which every marketplace accepts.</li>
      </ol>
      <h3>Getting marketplace-ready</h3>
      <ul>
        <li><strong>Fill the frame.</strong> Amazon wants the product to occupy about 85% of the image. Crop after removing the background if needed.</li>
        <li><strong>Shadows.</strong> Natural shadows are removed along with the background. Most sellers prefer that; if you want a soft drop shadow, add it in an editor afterwards.</li>
        <li><strong>Resolution.</strong> Keep the original. Zoom on Amazon needs at least 1600 px on the longest side.</li>
      </ul>
      <div class="tip"><p><strong>Tip.</strong> Batch it. Drop a whole folder of product shots at once; they process one after another on your device and each card downloads separately. Pro adds a single zip.</p></div>`,
    faq: [
      ['Is the white exactly 255,255,255?', 'Yes. The white swatch composites the cutout onto #ffffff, which is RGB 255, 255, 255, the value Amazon\'s image requirements specify.'],
      ['Does it work for clothing on mannequins or models?', 'Yes for the cutout. Note that Amazon\'s apparel rules have their own requirements about models and mannequins that are separate from the background colour.'],
      ['Can I get a transparent version too?', 'Yes. Click the checkerboard swatch before downloading and you get the same cutout as a transparent PNG.'],
    ],
  },
  {
    slug: 'bulk-background-remover',
    card: ['Bulk background remover', 'Whole folders, processed on your device'],
    title: 'Bulk Background Remover – Process Many Photos at Once, Free, No Upload',
    description: 'Remove backgrounds from dozens of photos in one go. Drop a folder, each image is processed on your device with no upload. Free per image; Pro adds a one-click zip.',
    pill: 'Drop a folder. Nothing uploaded.',
    h1: 'Remove backgrounds from <em>many photos at once.</em>',
    lede: 'Select a whole folder or paste image after image. Each photo is processed in sequence on your own device, so there is no per-image credit and nothing is uploaded. Pro adds a single zip download.',
    preset: null,
    content: `
      <h2>How bulk works here</h2>
      <ol>
        <li>Click <em>Choose images</em> and select as many files as you like, or drag a folder's contents onto the page.</li>
        <li>Images queue and process one after another. On a laptop with WebGPU that is one to three seconds each; a batch of fifty takes a couple of minutes.</li>
        <li>Each finished image gets its own card with download and colour options. Pro users get a <em>Download all as .zip</em> bar once two or more are done.</li>
      </ol>
      <h3>Why there is no per-image price</h3>
      <p>Every other bulk remover charges credits because every image costs them GPU time. DropBG does the work on your computer, so a batch of five hundred costs us the same as one. The only thing Pro adds to bulk is convenience: one zip instead of many downloads, and HD Refine for the tricky shots.</p>
      <h3>Practical limits</h3>
      <ul>
        <li>Browser memory is the ceiling. A few hundred 12-megapixel images in one session is fine on a desktop; on a phone, keep batches under about twenty.</li>
        <li>Keep the tab in the foreground. Browsers slow background tabs, which pauses the queue.</li>
        <li>Use the same background swatch for a consistent catalogue; the preset applies per card, so set it before downloading each one, or use the zip which respects each card's choice.</li>
      </ul>
      <div class="tip"><p><strong>Tip.</strong> For thousands of images a month, a server API such as PhotoRoom's or PurgeBG's is the right tool. For a catalogue refresh or a week's product shots, this page is free and private.</p></div>`,
    faq: [
      ['Is there a limit on how many images I can process?', 'No hard limit. Processing happens on your device, so the practical limit is your browser\'s memory. Hundreds per session on a desktop is normal.'],
      ['Do I need Pro for bulk?', 'No. Queueing many images is free. Pro adds a one-click zip of every finished image and the HD Refine pass.'],
      ['Can I automate this or call it from a script?', 'Not yet. DropBG is a browser tool. If you need an API, the review on our blog lists the current per-image API prices from other providers.'],
    ],
  },
];

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function jsonStr(s) { return JSON.stringify(s.replace(/<[^>]+>/g, '')); }
function between(src, start, end) {
  const a = src.indexOf(start), b = src.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`markers missing: ${start}`);
  return [a + start.length, b];
}
function replaceBetween(src, start, end, inner) {
  const [a, b] = between(src, start, end);
  return src.slice(0, a) + inner + src.slice(b);
}

function toolGrid(currentSlug) {
  const cards = [{ slug: '', card: ['Background remover', 'The general-purpose tool'] }, ...VARIANTS];
  return `\n      <div class="tool-grid">${cards.map((v) => `\n        <a class="tool-card${v.slug === currentSlug ? ' is-current' : ''}" href="./${v.slug}"${v.slug === currentSlug ? ' aria-current="page"' : ''}><strong>${esc(v.card[0])}</strong><span>${esc(v.card[1])}</span></a>`).join('')}\n      </div>\n      `;
}
function faqHtml(items) {
  return `\n${items.map(([q, a], i) => `      <details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${a}</p></details>`).join('\n')}\n      `;
}
function faqLd(items) {
  return `{"@type":"FAQPage","mainEntity":[${items.map(([q, a]) => `{"@type":"Question","name":${JSON.stringify(q)},"acceptedAnswer":{"@type":"Answer","text":${jsonStr(a)}}}`).join(',')}]}`;
}

export function generate() {
  const index = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  // Index gets the tool grid too (no current page).
  const indexOut = replaceBetween(index, '<!-- tools:start -->', '<!-- tools:end -->', toolGrid(''));
  if (indexOut !== index) writeFileSync(resolve(ROOT, 'index.html'), indexOut);

  const files = [];
  for (const v of VARIANTS) {
    let h = indexOut;
    h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(v.title)}</title>`);
    h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(v.description)}">`);
    h = h.replace(`<link rel="canonical" href="${BASE}">`, `<link rel="canonical" href="${BASE}${v.slug}">`);
    h = h.replace(`<meta property="og:url" content="${BASE}">`, `<meta property="og:url" content="${BASE}${v.slug}">`);
    h = h.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(v.title)}">`);
    h = h.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(v.description)}">`);
    // JSON-LD: swap the FAQPage node, keep WebApplication.
    h = h.replace(/\{"@type":"FAQPage","mainEntity":\[[\s\S]*?\]\}/, faqLd([...v.faq, ...SHARED_FAQ]));
    h = replaceBetween(h, '<!-- hero:start -->', '<!-- hero:end -->', `
    <section class="hero">
      <div class="pill"><span class="dot"></span> ${esc(v.pill)}</div>
      <h1>${v.h1}</h1>
      <p>${esc(v.lede)}</p>
    </section>
    `);
    h = replaceBetween(h, '<!-- variant:start -->', '<!-- variant:end -->', `
    <section class="section variant"><div class="prose">${v.content}
    </div></section>
    `);
    h = replaceBetween(h, '<!-- tools:start -->', '<!-- tools:end -->', toolGrid(v.slug));
    h = replaceBetween(h, '<!-- faq:start -->', '<!-- faq:end -->', faqHtml([...v.faq, ...SHARED_FAQ]));
    h = h.replace('<body>', `<body${v.preset ? ` data-preset='${JSON.stringify(v.preset)}'` : ''}>`);
    h = h.replace('<!doctype html>', `<!doctype html>\n<!-- GENERATED from index.html + scripts/variants.mjs. Edit those, not this file. -->`);
    const file = `${v.slug}.html`;
    writeFileSync(resolve(ROOT, file), h);
    files.push(file);
  }

  // Sitemap
  const pages = ['', ...VARIANTS.map((v) => v.slug), 'remove-bg-alternative', 'how-to-remove-background'];
  const today = new Date().toISOString().slice(0, 10);
  const sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${BASE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(resolve(ROOT, 'public/sitemap.xml'), sm);
  writeFileSync(resolve(ROOT, 'public/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
  return files;
}

if (process.argv[1] && process.argv[1].endsWith('variants.mjs')) console.log(generate());
