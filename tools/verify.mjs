/**
 * Acceptance script for the project reveal.
 *
 * It drives a real browser against the running preview and checks the four
 * things the reveal has to get right:
 *
 *   1. the title belongs to the top of the scrollable content and scrolls away
 *      with it, while SHARE and CLOSE stay sticky at the top-right;
 *   2. the entrance is slow and coordinated — the title comes from above, the
 *      content rises from below, and the marquee only starts afterwards;
 *   3. every project opens at scrollTop = 0, on a settled layout, without
 *      flashes, overlap or horizontal overflow;
 *   4. closing from a scrolled position animates away without jumping to the
 *      top, and the mosaic position is restored.
 *
 * Usage: node tools/verify.mjs [preview-url]
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const BASE = process.argv[2] ?? process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173';

const results = [];
let failures = 0;

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
  const mark = passed ? '  ok  ' : ' FAIL ';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForServer(url, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function ensureServer() {
  if (await waitForServer(BASE, 1200)) return null;
  const port = new URL(BASE).port || '4173';
  const child = spawn('node', ['tools/serve.mjs', port], { cwd: root, stdio: 'ignore' });
  const up = await waitForServer(BASE, 15000);
  if (!up) throw new Error(`the preview server did not start on ${BASE}`);
  return child;
}

const PROBE = () => {
  const pick = (selector) => document.querySelector(selector);
  const rect = (element) => (element ? element.getBoundingClientRect().toJSON() : null);

  const scroller = pick('[data-scroller]');
  const title = pick('[data-title]');
  const stage = pick('[data-stage]');
  const meta = pick('[data-meta]');
  const intro = pick('[data-intro]');
  const marquee = pick('[data-marquee]');
  const track = pick('[data-marquee-track]');
  const controls = pick('[data-controls]');
  const close = pick('[data-close]');
  const project = pick('[data-project]');

  return {
    pageScrollY: window.scrollY,
    scrollTop: scroller.scrollTop,
    scrollHeight: scroller.scrollHeight,
    scrollerRect: rect(scroller),
    titleRect: rect(title),
    stageRect: rect(stage),
    metaRect: rect(meta),
    introRect: rect(intro),
    marqueeRect: rect(marquee),
    closeRect: rect(close),
    titlePosition: getComputedStyle(title).position,
    titleTransform: getComputedStyle(title).transform,
    stageTransform: getComputedStyle(stage).transform,
    panelTransform: getComputedStyle(pick('[data-panel]')).transform,
    panelOpacity: Number.parseFloat(getComputedStyle(pick('[data-panel]')).opacity),
    titleOpacity: Number.parseFloat(getComputedStyle(title).opacity),
    stageOpacity: Number.parseFloat(getComputedStyle(stage).opacity),
    trackTransform: getComputedStyle(track).transform,
    trackInlineTransform: track.style.transform,
    controlsPosition: getComputedStyle(controls).position,
    titleAnimations: title.getAnimations().length,
    stageAnimations: stage.getAnimations().length,
    titleHeight: getComputedStyle(project).getPropertyValue('--project-title-h').trim(),
    panelHidden: project.hidden,
    titleText: pick('[data-title-a11y]').textContent,
    focusedTileIndex: document.activeElement?.dataset?.index ?? null,
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollerScrollWidth: scroller.scrollWidth,
    scrollerClientWidth: scroller.clientWidth,
    fontLoaded: document.fonts.check('500 32px "Inter Variable"'),
  };
};

const probe = (page) => page.evaluate(PROBE);

async function openTile(page, index) {
  await page.locator('.tile').nth(index).click();
}

async function waitForEntrance(page, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let state;

  // Poll from Node rather than the page's animation frame loop. In Chromium's
  // mobile emulation the page can be background-throttled, even though the
  // browser continues to paint the completed state.
  while (Date.now() < deadline) {
    state = await page.evaluate(() => {
      const title = document.querySelector('[data-title]');
      const stage = document.querySelector('[data-stage]');
      const project = document.querySelector('[data-project]');
      return Boolean(
        title &&
          stage &&
          project &&
          !project.hidden &&
          !project.classList.contains('is-armed') &&
          title.getAnimations().length === 0 &&
          stage.getAnimations().length === 0 &&
          getComputedStyle(title).transform === 'none' &&
          getComputedStyle(stage).transform === 'none',
      );
    });
    if (state) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const detail = await page.evaluate(() => {
    const title = document.querySelector('[data-title]');
    const stage = document.querySelector('[data-stage]');
    const project = document.querySelector('[data-project]');
    return {
      titleAnimations: title?.getAnimations().length,
      stageAnimations: stage?.getAnimations().length,
      titleTransform: title && getComputedStyle(title).transform,
      stageTransform: stage && getComputedStyle(stage).transform,
      projectHidden: project?.hidden,
      armed: project?.classList.contains('is-armed'),
      opening: window.__theme?.view?.state?.opening,
      open: window.__theme?.view?.state?.open,
    };
  });
  throw new Error(`project entrance did not settle: ${JSON.stringify(detail)}`);
}

async function run() {
  let server = null;
  let browser = null;
  let context = null;
  let mobile = null;
  let calm = null;

  try {
  server = await ensureServer();
  browser = await launchBrowser();

  const consoleErrors = [];
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile');

  /* ---------------------------------------------------------------- *
   * 1 — the title belongs to the top of the scrollable content
   * ---------------------------------------------------------------- */
  check('the mosaic renders every project', (await page.locator('.tile').count()) === 9);

  await openTile(page, 0);
  await waitForEntrance(page);
  let s = await probe(page);

  check('the project opens at scrollTop = 0', s.scrollTop === 0, `scrollTop = ${s.scrollTop}`);
  check('the panel is open', s.panelHidden === false);
  check('the title is not fixed or sticky', s.titlePosition === 'relative', s.titlePosition);
  check(
    'the whole title area is visible at scrollTop = 0',
    s.titleRect.top >= s.scrollerRect.top - 1 && s.titleRect.bottom <= s.scrollerRect.bottom + 1,
    `title ${Math.round(s.titleRect.top)}–${Math.round(s.titleRect.bottom)} in ${Math.round(s.scrollerRect.top)}–${Math.round(s.scrollerRect.bottom)}`,
  );
  check(
    'the metadata sits below the title',
    s.metaRect.top >= s.titleRect.bottom - 1,
    `meta top ${Math.round(s.metaRect.top)} vs title bottom ${Math.round(s.titleRect.bottom)}`,
  );
  check(
    'the description sits below the metadata',
    s.introRect.top >= s.metaRect.bottom - 1,
  );
  check('the title area is reserved before the content is placed', s.titleHeight !== '', s.titleHeight);
  check('the display font is loaded', s.fontLoaded === true);
  check('there is no horizontal overflow', s.docScrollWidth <= s.innerWidth + 1, `${s.docScrollWidth} / ${s.innerWidth}`);
  check(
    'the scroller does not scroll sideways',
    s.scrollerScrollWidth <= s.scrollerClientWidth + 1,
    `${s.scrollerScrollWidth} / ${s.scrollerClientWidth}`,
  );
  check('SHARE and CLOSE are sticky in the scroller', s.controlsPosition === 'sticky', s.controlsPosition);
  check(
    'the sticky controls sit at the top-right',
    s.closeRect.right > s.scrollerRect.right - 200 && s.closeRect.top < 80,
    `close at ${Math.round(s.closeRect.left)},${Math.round(s.closeRect.top)}`,
  );

  // Scroll: the title must leave, the controls must stay.
  const titleBefore = s.titleRect.top;
  const closeBefore = s.closeRect.top;
  await page.evaluate(() => {
    document.querySelector('[data-scroller]').scrollTop = 420;
  });
  await page.waitForTimeout(350);
  s = await probe(page);

  check(
    'the title scrolls out of view with the content',
    s.titleRect.top < titleBefore - 300,
    `${Math.round(titleBefore)} → ${Math.round(s.titleRect.top)}`,
  );
  check(
    'the title is not pinned while scrolling',
    s.titlePosition !== 'fixed' && s.titlePosition !== 'sticky',
  );
  check(
    'SHARE and CLOSE stay at the top-right while scrolling',
    Math.abs(s.closeRect.top - closeBefore) < 2 && s.closeRect.right > s.scrollerRect.right - 200,
    `close top ${Math.round(s.closeRect.top)}`,
  );

  /* ---------------------------------------------------------------- *
   * 2 — the entrance
   * ---------------------------------------------------------------- */
  await page.locator('[data-close]').click();
  await page.waitForTimeout(900);

  await openTile(page, 1);
  await page.waitForTimeout(260);
  const during = await probe(page);
  await waitForEntrance(page);
  const after = await probe(page);

  check(
    'the title enters from above',
    during.titleTransform !== 'none' && during.titleRect.top < after.titleRect.top - 4,
    `title top ${Math.round(during.titleRect.top)} → ${Math.round(after.titleRect.top)}`,
  );
  check(
    'the content rises from below',
    during.stageTransform !== 'none' && during.stageRect.top > after.stageRect.top + 4,
    `stage top ${Math.round(during.stageRect.top)} → ${Math.round(after.stageRect.top)}`,
  );
  check(
    'the entrance is slow, not a snap',
    during.titleOpacity < 1 && during.stageOpacity < 1,
    `opacity ${during.titleOpacity} / ${during.stageOpacity}`,
  );
  check(
    'the temporary transforms are removed when the reveal settles',
    after.titleTransform === 'none' && after.stageTransform === 'none',
    `title ${after.titleTransform}, stage ${after.stageTransform}`,
  );
  check(
    'nothing is left running after the reveal',
    after.titleAnimations === 0 && after.stageAnimations === 0,
  );
  check(
    'the content is fully revealed',
    after.titleOpacity === 1 && after.stageOpacity === 1,
  );
  check(
    'the marquee stays still while the entrance plays',
    during.trackInlineTransform === '' && during.trackTransform === 'none',
  );
  check(
    'the marquee waits until the entrance has settled',
    after.trackInlineTransform === '' && after.trackTransform === 'none',
    after.trackInlineTransform,
  );

  /* ---------------------------------------------------------------- *
   * 3 — scrolling during the entrance
   * ---------------------------------------------------------------- */
  await page.locator('[data-close]').click();
  await page.waitForTimeout(900);

  // Give the archive a non-zero position so the close path has a real mosaic
  // location to restore later.
  const mosaicScrollBeforeOpen = await page.evaluate(() => {
    window.scrollTo(0, 240);
    return window.scrollY;
  });
  await openTile(page, 2);
  await page.mouse.move(700, 500);
  await page.waitForTimeout(260);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1800);
  s = await probe(page);

  check(
    'a scroll during the entrance is not undone',
    s.scrollTop > 400,
    `scrollTop = ${s.scrollTop}`,
  );
  check(
    'the title has left the viewport after that scroll',
    s.titleRect.bottom < s.scrollerRect.top,
    `title bottom ${Math.round(s.titleRect.bottom)} vs scroller top ${Math.round(s.scrollerRect.top)}`,
  );

  /* ---------------------------------------------------------------- *
   * 4 — closing from a scrolled position
   * ---------------------------------------------------------------- */
  await page.evaluate(() => {
    document.querySelector('[data-scroller]').scrollTop = 900;
  });
  await page.waitForTimeout(250);
  const beforeClose = await probe(page);
  await page.locator('[data-close]').click();
  await page.waitForTimeout(130);
  const duringClose = await probe(page);
  await page.waitForTimeout(1000);
  const afterClose = await probe(page);

  check(
    'closing does not jump to the top of the project',
    duringClose.scrollTop > 400,
    `scrollTop = ${duringClose.scrollTop} (was ${beforeClose.scrollTop})`,
  );
  check(
    'the exit continues animating from the scrolled position',
    duringClose.panelTransform !== 'none' || duringClose.panelOpacity < 1,
    `panel ${duringClose.panelTransform}, opacity ${duringClose.panelOpacity}`,
  );
  check('the panel is closed', afterClose.panelHidden === true);
  check(
    'the mosaic position is restored',
    Math.abs(afterClose.pageScrollY - mosaicScrollBeforeOpen) < 2,
    `${mosaicScrollBeforeOpen} → ${afterClose.pageScrollY}`,
  );
  check(
    'focus returns to the project tile that was opened',
    afterClose.focusedTileIndex === '2',
    `focused tile ${afterClose.focusedTileIndex}`,
  );

  /* ---------------------------------------------------------------- *
   * 5 — reopening and several projects in a row
   * ---------------------------------------------------------------- */
  await openTile(page, 2);
  await waitForEntrance(page);
  s = await probe(page);
  check('the project reopens at scrollTop = 0', s.scrollTop === 0, `scrollTop = ${s.scrollTop}`);

  for (const index of [0, 4, 8]) {
    await page.locator('[data-close]').click();
    await page.waitForTimeout(800);
    await openTile(page, index);
    await waitForEntrance(page);
    s = await probe(page);
    const expected = await page.locator('.tile').nth(index).locator('.tile__title').textContent();
    check(
      `project ${index + 1} opens at the top with the right title`,
      s.scrollTop === 0 && s.titleText === expected,
      `${s.titleText} — scrollTop ${s.scrollTop}`,
    );
  }
  await page.locator('[data-close]').click();
  await page.waitForTimeout(800);

  /* ---------------------------------------------------------------- *
   * 6 — the mobile layout
   * ---------------------------------------------------------------- */
  mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (error) => consoleErrors.push(`mobile pageerror: ${error.message}`));
  await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('.tile');

  await mobilePage.locator('.tile').nth(1).click();
  // Mobile emulation is background-throttled in headless Chromium, so give
  // its compositor the same extra settle budget a physical device gets.
  await waitForEntrance(mobilePage, 10000);
  let m = await probe(mobilePage);

  check('mobile: the project opens at scrollTop = 0', m.scrollTop === 0);
  check(
    'mobile: the title area is fully visible',
    m.titleRect.top >= m.scrollerRect.top - 1 && m.titleRect.bottom <= m.scrollerRect.bottom + 1,
    `title ${Math.round(m.titleRect.top)}–${Math.round(m.titleRect.bottom)} in ${Math.round(m.scrollerRect.top)}–${Math.round(m.scrollerRect.bottom)}`,
  );
  check('mobile: the metadata sits below the title', m.metaRect.top >= m.titleRect.bottom - 1);
  check('mobile: no horizontal overflow', m.docScrollWidth <= m.innerWidth + 1, `${m.docScrollWidth} / ${m.innerWidth}`);
  check(
    'mobile: the scroller does not scroll sideways',
    m.scrollerScrollWidth <= m.scrollerClientWidth + 1,
    `${m.scrollerScrollWidth} / ${m.scrollerClientWidth}`,
  );
  check(
    'mobile: the sticky controls are at the top-right',
    m.closeRect.right > m.scrollerRect.right - 160 && m.closeRect.top < 70,
    `close at ${Math.round(m.closeRect.left)},${Math.round(m.closeRect.top)}`,
  );
  check(
    'mobile: the marquee waits until the entrance has settled',
    m.trackInlineTransform === '' && m.trackTransform === 'none',
    m.trackInlineTransform,
  );

  // It starts after a short pause, then only moves a few pixels while its
  // 1.2-second velocity ramp eases into the full drift.
  await mobilePage.waitForTimeout(1000);
  m = await probe(mobilePage);
  const marqueeX = Math.abs(
    Number.parseFloat(m.trackInlineTransform.match(/translate3d\((-?[\d.]+)px/)?.[1] ?? '0'),
  );
  check(
    'mobile: the marquee begins with a gentle ramp',
    marqueeX > 0 && marqueeX < 25,
    `${m.trackInlineTransform} (${marqueeX.toFixed(1)}px)`,
  );

  await mobilePage.evaluate(() => {
    document.querySelector('[data-scroller]').scrollTop = 600;
  });
  await mobilePage.waitForTimeout(300);
  m = await probe(mobilePage);
  check('mobile: the title scrolls away', m.titleRect.bottom < m.scrollerRect.top);
  check(
    'mobile: the controls stay at the top-right while scrolling',
    m.closeRect.right > m.scrollerRect.right - 160 && m.closeRect.top < 70,
  );
  await mobilePage.locator('[data-close]').click();
  await mobilePage.waitForTimeout(900);
  /* ---------------------------------------------------------------- *
   * 7 — reduced motion
   * ---------------------------------------------------------------- */
  calm = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const calmPage = await calm.newPage();
  await calmPage.goto(BASE, { waitUntil: 'networkidle' });
  await calmPage.waitForSelector('.tile');
  await calmPage.locator('.tile').nth(0).click();
  await calmPage.waitForTimeout(600);
  const c = await probe(calmPage);
  check(
    'reduced motion: the project is revealed without animating',
    c.titleTransform === 'none' && c.stageTransform === 'none' && c.titleOpacity === 1,
  );
  check('reduced motion: the project is readable', c.titleText.length > 0);
  /* ---------------------------------------------------------------- *
   * 8 — nothing threw
   * ---------------------------------------------------------------- */
  check('no console errors during the run', consoleErrors.length === 0, consoleErrors.join(' | '));

  console.log('');
  console.log(`${results.length - failures}/${results.length} checks passed`);
  if (failures) {
    console.log('');
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  ✗ ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
  } finally {
    if (calm) await calm.close().catch(() => {});
    if (mobile) await mobile.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server) server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
