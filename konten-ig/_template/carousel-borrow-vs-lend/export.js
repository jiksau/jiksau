// Export every <section class="slide"> in an HTML file to 1080x1350 PNGs.
// Usage: node export.js <folder>   (reads <folder>/slides.html, writes <folder>/out/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const dir = path.resolve(process.argv[2]);
  const name = path.basename(dir);
  const out = path.join(dir, 'out');
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
  await page.goto('file://' + path.join(dir, 'slides.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const slides = await page.$$('section.slide');
  for (let i = 0; i < slides.length; i++) {
    const file = path.join(out, `${name}-${String(i + 1).padStart(2, '0')}.png`);
    await slides[i].screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
})();
