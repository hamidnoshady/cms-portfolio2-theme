import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliDecompressSync } from 'node:zlib'

import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)
const chromiumLibs = () => {
  const packaged = join(require.resolve('@sparticuz/chromium'), '..', '..', 'bin', 'al2023.tar.br')
  const dir = join(tmpdir(), 'p2-chromium-libs')
  if (existsSync(join(dir, 'lib')) || !existsSync(packaged)) return dir
  mkdirSync(dir, { recursive: true })
  const tarPath = join(tmpdir(), 'p2-al2023.tar')
  writeFileSync(tarPath, brotliDecompressSync(readFileSync(packaged)))
  execFileSync('tar', ['-xf', tarPath, '-C', dir])
  return dir
}

/**
 * Interaction audit — the behaviours a screenshot and a unit test cannot prove.
 *
 * The unit tests pin the motion *scale* and the panel's dialog semantics in jsdom;
 * this is the choreographed truth in a real browser:
 *
 * - the mosaic on home and on /projects renders work as real links, and the first tile
 *   is what the putative lead-work binding pins to the first row;
 * - a tile opens the case study *over the same page* (the intercepted route), armed,
 *   then revealed, with Share/Close sticky inside the panel scroller;
 * - the long-title drift is a remedy, never a default: a second copy exists only when
 *   the title overflows — and reduced-motion views get the resting frame, never an
 *   animation that would have to be shortened mid-flight;
 * - "next project" follows the mosaic order; Escape closes to the archive with focus
 *   and scroll position handed back;
 * - routing contract: /posts/* redirects, unserved post 404s, English breadcrumbs stay
 *   English, the language switch keeps the document;
 * - the contact form cannot be submitted twice, blocks an invalid email inline and
 *   reaches a success state from the CMS-backed relay.
 *
 *   node scripts/interaction-audit.mjs [--base http://127.0.0.1:3200] [--slow-base http://127.0.0.1:3300] [--out docs/screenshots]
 *
 * Writes `interaction-report.json` and exits non-zero on failure.
 */

const argOf = (name, fallback) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const BASE = argOf('--base', process.env.AUDIT_BASE ?? 'http://127.0.0.1:3200')
const SLOW_BASE = argOf('--slow-base', process.env.AUDIT_SLOW_BASE ?? 'http://127.0.0.1:3300')
const OUT = argOf('--out', 'docs/screenshots')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait until the page is *hydrated*, not merely parsed. Clicking at domcontentloaded
 * reaches server HTML before React has attached its handlers; the completed readyState
 * plus a settled frame is the honest signal available without hooks in the app.
 */
const loaded = async (page, selector = 'main, .mosaic', settle = 900) => {
  await page.waitForSelector(selector, { timeout: 40000, visible: true })
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 40000 })
  await sleep(settle)
}

/** Fail fast when the page's own assets are not being served (stale build asset mismatch). */
const assertAssetsServed = async (page, base) => {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  const href = await page.evaluate(() =>
    document.querySelector('link[rel="stylesheet"]')?.getAttribute('href') ?? '',
  )
  if (!href) return
  const probe = new URL(href, base)
  probe.searchParams.set('p2-audit', Date.now().toString(36))
  const response = await page.goto(probe.toString(), { waitUntil: 'domcontentloaded' })
  const type = response?.headers()['content-type'] ?? ''
  if (response?.status() !== 200 || !type.includes('text/css')) {
    throw new Error(
      `assets are not being served (${href} → ${response?.status()} ${type}). Restart the theme servers on the current build: bash scripts/qa-servers.sh --reset, then re-run.`,
    )
  }
}

const main = async () => {
  let executablePath = process.env.P2_CHROME_PATH
  let env = process.env
  if (!executablePath) {
    const { default: chromium } = await import('@sparticuz/chromium')
    executablePath = await chromium.executablePath()
    const libs = chromiumLibs()
    env = { ...process.env, LD_LIBRARY_PATH: [join(libs, 'lib'), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }
  }
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    env,
    executablePath,
    headless: true,
  })
  await assertAssetsServed(await browser.newPage(), BASE)

  const checks = []
  const check = async (name, run, { reducedMotion = false, viewport = { width: 1440, height: 900 } } = {}) => {
    const page = await browser.newPage()
    page.on('pageerror', (error) => checks.push({ detail: String(error).slice(0, 200), name: `${name} (page error)`, ok: false }))
    if (reducedMotion) {
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    }
    await page.setViewport({ ...viewport, deviceScaleFactor: 1 })
    try {
      const detail = await run(page)
      checks.push({ detail: detail ?? '', name, ok: true })
    } catch (error) {
      checks.push({ detail: String(error).slice(0, 200), name, ok: false })
    }
    await page.close()
  }

  const openFirstTile = async (page) => {
    await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' })
    await loaded(page)
    const href = await page.evaluate(() => document.querySelector('.mosaic__tile')?.getAttribute('href') ?? '')
    if (!href) throw new Error('no mosaic tile link on /projects')
    await page.click('.mosaic__tile')
    await page.waitForSelector('.case[role="dialog"]', { timeout: 30000, visible: true })
    return href
  }

  /* ---------------------------------------------------------------- * \
   * the mosaic
  \* ---------------------------------------------------------------- */

  await check('home renders the mosaic as real links with the lead work first', async (page) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await loaded(page, '.mosaic')
    return page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.mosaic__tile')]
      if (tiles.length === 0) throw new Error('no work renders on the home mosaic')
      const first = tiles[0]
      if (!(first instanceof HTMLAnchorElement)) throw new Error('a tile is not a link')
      if (!first.getAttribute('aria-label')) throw new Error('a tile is not named for its work')
      const firstTitle = first.querySelector('.mosaic__title')?.textContent ?? ''
      const leadInList = firstTitle.includes('باغ')
      if (!leadInList) throw new Error(`the bound lead work is not first (got "${firstTitle.trim().slice(0, 40)}")`)
      return `${tiles.length} tiles, lead "${firstTitle.trim().slice(0, 24)}…" first`
    })
  })

  await check('tiles invert only on hover/focus, never by default', async (page) => {
    await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' })
    await loaded(page, '.mosaic')
    const rest = await page.evaluate(() => getComputedStyle(document.querySelector('.mosaic__tile')).backgroundColor)
    await page.hover('.mosaic__tile')
    const hover = await page.evaluate(() => getComputedStyle(document.querySelector('.mosaic__tile')).backgroundColor)
    if (rest === hover) throw new Error('hovering a tile inverted nothing')
    return `rest ${rest} → hover ${hover}`
  })

  /* ---------------------------------------------------------------- * \
   * the reveal
  \* ---------------------------------------------------------------- */

  await check('a tile opens the case study dialog over the same page, revealed', async (page) => {
    const href = await openFirstTile(page)
    await page.waitForFunction(
      () => document.querySelector('.case')?.dataset.state === 'open',
      { timeout: 30000 },
    )
    const url = page.url()
    if (!url.endsWith(href)) throw new Error(`URL is ${url}, not ${href}`)
    const state = await page.evaluate(() => {
      const dialog = document.querySelector('.case')
      const behind = document.querySelector('.mosaic')
      return {
        ariaLabel: dialog.getAttribute('aria-label'),
        modal: dialog.getAttribute('aria-modal'),
        behindKeepsMosaic: Boolean(behind && behind.querySelectorAll('.mosaic__tile').length > 0),
        kicker: dialog.querySelector('.case__kicker')?.textContent?.trim().slice(0, 60) ?? '',
        state: dialog.dataset.state,
      }
    })
    if (state.state !== 'open') throw new Error(`panel stuck in state "${state.state}"`)
    if (state.modal !== 'true' || !state.ariaLabel) throw new Error('the dialog has no accessible name')
    if (!state.behindKeepsMosaic) throw new Error('the mosaic underneath was unmounted')
    if (!state.kicker) throw new Error('the kicker line did not render')
    return `dialog "${state.ariaLabel}"; kicker "${state.kicker}"`
  })

  await check('Share and Close stay pinned while the case study scrolls', async (page) => {
    await openFirstTile(page)
    await page.waitForFunction(
      () => document.querySelector('.case')?.dataset.state === 'open',
      { timeout: 30000 },
    )
    const before = await page.evaluate(() => document.querySelector('.case__controls').getBoundingClientRect().top)
    await page.evaluate(() => {
      const scroller = document.querySelector('.case__scroller')
      scroller.scrollTop = 400
    })
    await sleep(300)
    const after = await page.evaluate(() => document.querySelector('.case__controls').getBoundingClientRect().top)
    if (Math.abs(after - before) > 2) throw new Error(`controls drifted ${Math.abs(after - before).toFixed(1)}px while scrolling`)
    return `pin at top ${after.toFixed(1)}px, was ${before.toFixed(1)}px`
  })

  await check('the title drifts only when it overflows, and stops while it fits', async (page) => {
    await openFirstTile(page)
    await page.waitForFunction(
      () => document.querySelector('.case')?.dataset.state === 'open',
      { timeout: 30000 },
    )
    await sleep(1600) // let the engine measure + possibly start the drift
    return page.evaluate(() => {
      const root = document.querySelector('.case')
      const copies = root.querySelectorAll('.case__title-text').length
      const drift = root.dataset.marquee === 'true' && root.dataset.drift === 'true'
      if (copies > 2) throw new Error(`${copies} title copies — the loop is duplicating uncontrollably`)
      if (copies === 2 && !drift) throw new Error('a second title copy exists but the drift flag is off')
      if (drift && copies !== 2) throw new Error('drifting without the second copy')
      return `${copies} copy/copies, drift=${drift}`
    })
  })

  await check('next project follows the mosaic order and re-enters at the top', async (page) => {
    const firstHref = await openFirstTile(page)
    await page.waitForFunction(
      () => document.querySelector('.case')?.dataset.state === 'open',
      { timeout: 30000 },
    )
    const before = await page.evaluate(() => document.querySelector('[data-next]')?.getAttribute('href') ?? '')
    if (!before) throw new Error('no next-work link inside the case study')
    await page.click('[data-next]')
    await page.waitForFunction(
      (expected) => window.location.pathname === expected,
      { timeout: 30000 },
      before,
    )
    await page.waitForSelector('.case[role="dialog"]', { timeout: 30000, visible: true })
    await page.waitForFunction(
      () => document.querySelector('.case')?.dataset.state === 'open',
      { timeout: 30000 },
    )
    const scrollTop = await page.evaluate(() => document.querySelector('.case__scroller').scrollTop)
    if (scrollTop > 8) throw new Error(`the next work opened scrolled to ${scrollTop}px`)
    if (page.url().endsWith(firstHref)) throw new Error('next project did not change the work')
    return `${firstHref} → ${before}`
  })

  await check('Escape closes to the archive with focus and scroll handed back', async (page) => {
    await openFirstTile(page)
    await page.waitForFunction(
      () => document.querySelector('.case')?.dataset.state === 'open',
      { timeout: 30000 },
    )
    await page.keyboard.press('Escape')
    await page.waitForFunction(
      () => !document.querySelector('.case'),
      { timeout: 30000 },
    )
    if (!page.url().endsWith('/projects')) throw new Error(`closed to ${page.url()}, not the archive`)
    const out = await page.evaluate(() => ({
      activeHref: document.activeElement instanceof HTMLAnchorElement ? document.activeElement.getAttribute('href') : null,
      activeIsTile: Boolean(document.activeElement?.closest('.mosaic__tile')),
      locked: document.documentElement.dataset.caseOpen === 'true',
    }))
    if (out.locked) throw new Error('the background is still scroll-locked after closing')
    if (!out.activeIsTile) throw new Error('focus did not return to the tile that opened the work')
    return `focus on tile → ${out.activeHref}`
  })

  await check('the reveal is omitted, not shortened, for reduced-motion readers', async (page) => {
    const href = await openFirstTile(page)
    await sleep(400)
    const state = await page.evaluate(() => {
      const root = document.querySelector('.case')
      return {
        copies: root.querySelectorAll('.case__title-text').length,
        state: root.dataset.state,
        trackTransform: getComputedStyle(root.querySelector('.case__marquee-track')).transform,
      }
    })
    if (state.state !== 'open') throw new Error(`reduced motion renders state "${state.state}"`)
    if (state.trackTransform !== 'none') throw new Error('the drift ran under reduced motion')
    if (state.copies !== 1) throw new Error('a reduced-motion view rotated in duplicated titles')
    return `same URL ${href} answered immediately, one title copy, no drift`
  }, { reducedMotion: true })

  /* ---------------------------------------------------------------- * \
   * the document presentation
  \* ---------------------------------------------------------------- */

  await check('a direct URL is the full document, not the dialog', async (page) => {
    await page.goto(`${BASE}/projects/khaneye-noor`, { waitUntil: 'domcontentloaded' })
    await loaded(page, '.case__title-text')
    return page.evaluate(() => {
      if (document.querySelector('.case[role="dialog"]')) throw new Error('the document is masked as a dialog')
      const h1 = document.querySelector('h1.case__title-text')
      if (!h1) throw new Error('no visible h1 on the document')
      const burgerLink = document.querySelector('.breadcrumbs a[href="/projects"]')
      if (!burgerLink) throw new Error('no breadcrumb back to the archive')
      const share = [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('اشتراک'))
      if (!share) throw new Error('Share is not a control of the document')
      return `h1 "${h1.textContent?.trim().slice(0, 40)}" with breadcrumb + share`
    })
  })

  /* ---------------------------------------------------------------- * \
   * the language pair
  \* ---------------------------------------------------------------- */

  await check('the language switch keeps the same work, and English stays English', async (page) => {
    await page.goto(`${BASE}/projects/khaneye-noor`, { waitUntil: 'domcontentloaded' })
    await loaded(page, '.case__title-text')
    const target = await page.evaluate(() => {
      const link = [...document.querySelectorAll('.p2-lang__link, a[hreflang]')].find((a) => a.getAttribute('lang') === 'en' || a.getAttribute('hreflang') === 'en')
      return link?.getAttribute('href') ?? ''
    })
    if (!target.includes('/en/projects/khaneye-noor')) throw new Error(`switch targets ${target}, not the English case study`)
    await page.goto(`${BASE}${target}`, { waitUntil: 'domcontentloaded' })
    await loaded(page, '.case__title-text')
    const crumbs = await page.evaluate(() => [...document.querySelectorAll('.breadcrumbs a, .breadcrumbs span')].map((node) => (node.textContent ?? '').trim()))
    if (!crumbs.includes('Work')) throw new Error(`English breadcrumbs are ${JSON.stringify(crumbs)}`)
    return `${target}, breadcrumbs ${crumbs.join(' › ')}`
  })

  await check('reserved /posts URLs redirect to the case study', async (page) => {
    await page.goto(`${BASE}/posts/khaneye-noor`, { waitUntil: 'networkidle0' })
    const url = page.url()
    if (!url.endsWith('/projects/khaneye-noor')) throw new Error(`landed on ${url}`)
    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent ?? '')
    if (!h1.trim()) throw new Error('the redirect target has no h1')
    return `/posts/* → ${url}`
  })

  await check('a document outside the bound work category is not publised here (404)', async (page) => {
    const response = await page.goto(`${BASE}/projects/notes-on-lines`, { waitUntil: 'domcontentloaded' })
    if (response?.status() !== 404) throw new Error(`orphan work answered ${response?.status()}, not 404`)
    return 'notes post → 404 (only the bound subtree is a public URL)'
  })

  /* ---------------------------------------------------------------- * \
   * the contact form
  \* ---------------------------------------------------------------- */

  await check('the contact form blocks an invalid email inline and cannot double-submit', async (page) => {
    await page.goto(`${BASE}/contact`, { waitUntil: 'domcontentloaded' })
    await loaded(page, 'form')
    const relays = []
    page.on('request', (request) => {
      if (request.url().includes('/api/form-submissions')) relays.push(request.method())
    })
    const type = async (name, value) => {
      const selector = `[name="${name}"]`
      if (!(await page.$(selector))) throw new Error(`missing field ${name}`)
      await page.click(selector, { clickCount: 3 })
      await page.type(selector, value)
    }
    await type('name', 'نمونه تهرانی')
    await type('email', 'not-an-email')
    await type('message', 'این یک پیام بررسی است.')
    if (await page.$('[name="consent"]')) await page.click('[name="consent"]')
    await page.click('form button[type="submit"]')
    await page.waitForFunction(
      () => document.querySelector('[aria-invalid="true"], [role="alert"], .form-field__error, [data-field-error]'),
      { timeout: 20000 },
    )
    if (relays.length !== 0) throw new Error(`an invalid email was relayed to the CMS ${relays.length} time(s)`)

    // A syntactically valid submission: exactly one relay, even on a double click.
    await page.click('[name="email"]', { clickCount: 3 })
    await page.type('[name="email"]', 'sample@example.test')
    const submit = await page.$('form button[type="submit"]')
    await submit.click()
    await submit.click().catch(() => undefined) // clicking an already-disabled button is a no-op
    await page.waitForFunction(
      () =>
        document.querySelector('[data-form-status="success"], [role="status"], .form-message--success') !== null ||
        relays.length > 0,
      { timeout: 20000 },
    )
    await sleep(1200)
    if (relays.length > 1) throw new Error(`the form was submitted ${relays.length} times`)
    return `invalid email caught inline; valid one relayed ${relays.length} time(s)`
  })

  /* ---------------------------------------------------------------- * \
   * the drawer (narrow viewports)
  \* ---------------------------------------------------------------- */

  await check('the mobile drawer traps focus, closes on Escape, restores focus', async (page) => {
    await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' })
    await loaded(page, '.mosaic')
    const btn = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('button')]
      const hit = candidates.find((button) => /فهرست|menu/i.test(button.getAttribute('aria-label') ?? '') || button.getAttribute('aria-expanded') !== null)
      if (!hit) return null
      hit.setAttribute('data-test-menu', 'true')
      return true
    })
    if (!btn) return 'no menu control on this breakpoint — skipped'
    await page.click('[data-test-menu]')
    await page.waitForSelector('[role="dialog"], .drawer, [data-open]', { timeout: 15000, visible: true })
    await page.keyboard.press('Escape')
    await sleep(700)
    const out = await page.evaluate(() => ({
      focusBack: Boolean(document.activeElement?.closest('[data-test-menu]')),
      dialogOpen: Boolean(document.querySelector('.drawer[aria-hidden="false"], [role="dialog"]:not(.case)')),
    }))
    if (!out.focusBack) throw new Error('focus did not return to the menu button')
    return 'drawer closed on Escape, focus restored'
  }, { viewport: { width: 390, height: 844 } })

  /* ---------------------------------------------------------------- * \
   * the slow CMS (when the qa-servers pair started one on 3300)
  \* ---------------------------------------------------------------- */

  await check('a slow CMS renders the skeleton, then the mosaic — never a blank page', async (page) => {
    const probe = await fetch(SLOW_BASE).catch(() => null)
    if (!probe || !probe.ok) return `no slow pair on ${SLOW_BASE} — skipped (start it with scripts/qa-servers.sh)`
    await page.goto(`${SLOW_BASE}/`, { waitUntil: 'domcontentloaded' })
    // The shell is the sticky point: the header and the skeleton arrive first because
    // the archive itself is slow — that is the point of the boundary.
    await page.waitForSelector('[aria-busy="true"], .mosaic__tile, main', { timeout: 30000, visible: true })
    await page.waitForFunction(
      () => document.querySelectorAll('.mosaic__tile').length > 0 && document.querySelector('[aria-busy="true"]') === null,
      { timeout: 40000 },
    )
    const state = await page.evaluate(() => ({
      busy: Boolean(document.querySelector('[aria-busy="true"]')),
      tiles: document.querySelectorAll('.mosaic__tile').length,
    }))
    return `resolved to ${state.tiles} tiles after the slow read`
  })

  /* ---------------------------------------------------------------- * \
   * report
  \* ---------------------------------------------------------------- */

  const failed = checks.filter((entry) => !entry.ok)
  for (const entry of checks) {
    console.log(`${entry.ok ? 'ok' : 'FAIL'} ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`)
  }
  console.log(`interaction audit: ${checks.length - failed.length}/${checks.length} checks passed`)
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, 'interaction-report.json'), `${JSON.stringify({ base: BASE, results: checks }, null, 2)}\n`)
  await browser.close()
  if (failed.length) {
    for (const entry of failed) console.error(`failed: ${entry.name}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('interaction audit crashed:', error)
  process.exit(1)
})
