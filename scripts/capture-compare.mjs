import { chromium, devices } from 'playwright';

const preview = 'https://3000-i9fcd71ruqhxjvqzpip9u.e2b.app';
const reference = 'https://bybang.co';
const browser = await chromium.launch({ headless: true });

async function shot(url, path, viewport, actions) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (actions) await actions(page);
  await page.screenshot({ path, fullPage: false });
  await page.close();
}

async function shotMobile(url, path, actions) {
  const page = await browser.newPage({ ...devices['iPhone 13'] });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (actions) await actions(page);
  await page.screenshot({ path, fullPage: false });
  await page.close();
}

await shot(reference, 'compare/ref-home-desktop.png', { width: 1440, height: 900 });
await shot(preview, 'compare/our-home-desktop.png', { width: 1440, height: 900 });
await shotMobile(reference, 'compare/ref-home-mobile.png');
await shotMobile(preview, 'compare/our-home-mobile.png');

await shot(reference + '/projects/cortaderas', 'compare/ref-case-desktop.png', { width: 1440, height: 900 });
await shot(preview + '/projects/casa-litoral', 'compare/our-case-desktop.png', { width: 1440, height: 900 });
await shot(reference + '/about', 'compare/ref-about-desktop.png', { width: 1440, height: 900 });
await shot(preview + '/about', 'compare/our-about-desktop.png', { width: 1440, height: 900 });
await shot(preview + '/projects', 'compare/our-index-desktop.png', { width: 1440, height: 900 });

await shot(reference, 'compare/ref-home-hover-nav.png', { width: 1440, height: 900 }, async (page) => {
  await page.hover('text=About');
  await page.waitForTimeout(500);
});
await shot(preview, 'compare/our-home-hover-nav.png', { width: 1440, height: 900 }, async (page) => {
  await page.hover('text=about');
  await page.waitForTimeout(500);
});

await shot(preview, 'compare/our-home-scroll-down.png', { width: 1440, height: 900 }, async (page) => {
  for (let i = 0; i < 45; i++) { await page.mouse.wheel(0, 220); await page.waitForTimeout(16); }
  await page.waitForTimeout(900);
});
await shot(preview, 'compare/our-home-scroll-up.png', { width: 1440, height: 900 }, async (page) => {
  for (let i = 0; i < 45; i++) { await page.mouse.wheel(0, 220); await page.waitForTimeout(16); }
  for (let i = 0; i < 65; i++) { await page.mouse.wheel(0, -220); await page.waitForTimeout(16); }
  await page.waitForTimeout(900);
});
await shot(preview, 'compare/our-home-after-close.png', { width: 1440, height: 900 }, async (page) => {
  await page.mouse.wheel(0, 720);
  await page.waitForTimeout(600);
  await page.locator('[data-idx="0"]').click({ force: true });
  await page.waitForTimeout(900);
  await page.locator('text=Close').first().click({ force: true });
  await page.waitForTimeout(900);
});

await browser.close();
