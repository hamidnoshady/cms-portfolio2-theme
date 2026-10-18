import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The stylesheet side of the UI contract: numbers and selectors the design fixes and a
 * refactor could silently drift. Read as text on purpose — jsdom does not lay out, and
 * these are promises about the *source*, not about a browser.
 */

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const structure = read('src/styles/structure.css')
const components = read('src/styles/components.css')
const tokens = read('src/styles/tokens.css')
const mosaic = read('src/styles/mosaic.css')
const caseStudy = read('src/styles/case-study.css')
const typography = read('src/styles/typography.css')

/** The CSS block(s) matching `selector` (the text between its `{` and the matching `}`). */
const blocks = (css: string, selector: string): string[] => {
  const out: string[] = []
  const pattern = new RegExp(`(^|[\\s,])${selector.replace(/[.[\]]/gu, '\\$&')}\\s*\\{`, 'gu')
  for (const match of css.matchAll(pattern)) {
    const start = match.index + match[0].length
    out.push(css.slice(start, css.indexOf('}', start)))
  }
  return out
}

/** The media-query bodies in `css` keyed by their condition. */
const mediaQueries = (css: string): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  const pattern = /@media\s*([^{]+)\{/gu
  for (const match of css.matchAll(pattern)) {
    let depth = 1
    let cursor = match.index + match[0].length
    while (depth > 0 && cursor < css.length) {
      const char = css[cursor]
      if (char === '{') depth += 1
      if (char === '}') depth -= 1
      cursor += 1
    }
    const key = match[1]!.trim()
    map.set(key, [...(map.get(key) ?? []), css.slice(match.index + match[0].length, cursor - 1)])
  }
  return map
}

const px = (css: string, variable: string): number => {
  const match = css.match(new RegExp(`${variable}:\\s*(\\d+(?:\\.\\d+)?)px`, 'u'))
  if (!match) throw new Error(`${variable} is not a px value in:\n${css}`)
  return Number(match[1])
}

describe('media grid: 2 columns on phones and tablets, 3 on desktop', () => {
  it('defaults to two columns and only grows at the 64rem (desktop) breakpoint', () => {
    const [base] = blocks(structure, '.grid-media')
    expect(base).toMatch(/grid-template-columns:\s*repeat\(2,/u)

    const queries = mediaQueries(structure)
    const desktop = (queries.get('(min-width: 64rem)') ?? []).join('\n')
    expect(desktop).toMatch(/\.grid-media\s*\{[^}]*repeat\(3,/u)
    expect(desktop).toMatch(/\.grid-media--2\s*\{[^}]*repeat\(2,/u)
    expect(desktop).toMatch(/\.grid-media--4\s*\{[^}]*repeat\(4,/u)

    const tablet = (queries.get('(min-width: 48rem)') ?? []).join('\n')
    expect(tablet).not.toContain('.grid-media')
  })

  it('has no second, static grid implementation left behind', () => {
    expect(components).not.toContain('.media-grid__list')
    expect(components).not.toContain('.gallery-item--button')
  })
})

describe('the mosaic: the index of work', () => {
  it('is one hairline grid: 12 columns, 1px separation owned by the grid alone', () => {
    const [grid] = blocks(mosaic, '.mosaic')
    expect(grid).toMatch(/grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/u)
    expect(grid).toMatch(/gap:\s*var\(--line-w\)/u)
    expect(grid).toMatch(/background:\s*var\(--line-structural-color\)/u)
    // A tile must never draw its own border — two rules at a shared edge would join.
    const [tile] = blocks(mosaic, '.mosaic__tile')
    expect(tile).not.toMatch(/border:/u)
  })

  it('composes spans by plan data, never by nth-child magic, and collapses below the breakpoint', () => {
    for (const span of ['4', '6', '8', '12']) {
      const [rule] = blocks(mosaic, `.mosaic__tile[data-span='${span}']`)
      expect(rule, `span ${span} is unsupported`).toMatch(new RegExp('grid-column:\\s*span ' + span, 'u'))
      expect(mosaic).toContain(`[data-span='${span}']`)
    }
    const collapsed = mediaQueries(mosaic).get('(max-width: 56.24rem)')?.join('\n') ?? ''
    expect(collapsed).toMatch(/\.mosaic__tile\s*\{[^}]*grid-column:\s*span 12/u)
  })

  it('inverts a tile on hover *and* keyboard focus, with the invert states complete', () => {
    expect(mosaic).toMatch(
      /\.mosaic__tile:is\(:hover,\s*:focus-visible\)\s*\{[^}]*background:\s*var\(--ink\)[^}]*color:\s*var\(--ink-invert\)/u,
    )
    // Inverted tiles flip their artwork; the caption ink is a translucent white, not grey.
    expect(mosaic).toMatch(/\.mosaic__tile:is\(:hover,\s*:focus-visible\) \.mosaic__art\s*\{[^}]*opacity: 0\.26[^}]*filter: invert\(1\)/u)
  })

  it('keeps the artwork behind the type at 7% opacity, arriving further on hover only', () => {
    const [art] = blocks(mosaic, '.mosaic__art')
    expect(art).toMatch(/z-index:\s*-1/u)
    expect(art).toMatch(/opacity:\s*0\.07\b/u)
    expect(art).toMatch(/position:\s*absolute/u)
  })

  it('writes every tile line in tokens, never a raw colour, size or duration', () => {
    const [tile] = blocks(mosaic, '.mosaic__tile')
    const [top] = blocks(mosaic, '.mosaic__top')
    const [title] = blocks(mosaic, '.mosaic__title')
    for (const block of [tile, top, title]) {
      // Raw colour is the drift that matters (every tile reads tokens); px geometry
      // inside a clamp is device design, and durations must still come from tokens.
      expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/iu)
      expect(block).not.toMatch(/\d+(?:\.\d+)?ms/u)
    }
    expect(title).toMatch(/font-size:\s*var\(--text-title\)/u)
    expect(blocks(mosaic, '.mosaic__summary')[0]).toMatch(/color:\s*var\(--ink-secondary\)/u)
  })
})

describe('the case study: title in flow, controls sticky, scroller never transformed', () => {
  it('the panel covers the viewport above the mosaic', () => {
    const [panel] = blocks(caseStudy, '.case')
    expect(panel).toMatch(/position:\s*fixed/u)
    expect(panel).toMatch(/inset:\s*0/u)
    expect(panel).toMatch(/z-index:\s*var\(--z-panel\)/u)
    const [documentPanel] = blocks(caseStudy, '.case--document')
    expect(documentPanel).toMatch(/position:\s*static/u)
  })

  it('the scroller is the only scroll container and never carries a transform', () => {
    const [scroller] = blocks(caseStudy, '.case__scroller')
    expect(scroller).toMatch(/overflow-y:\s*auto/u)
    expect(scroller).toMatch(/overflow-x:\s*hidden/u)
    expect(scroller).not.toMatch(/transform/u)
  })

  it('Share and Close stick inside the scroller at zero height', () => {
    const [controls] = blocks(caseStudy, '.case__controls')
    expect(controls).toMatch(/position:\s*sticky/u)
    expect(controls).toMatch(/inset-block-start:\s*0/u)
    expect(controls).toMatch(/block-size:\s*0/u)
    expect(controls).toMatch(/z-index:\s*var\(--z-controls\)/u)
  })

  it('the title stays in the normal flow — never fixed, never sticky', () => {
    const [title] = blocks(caseStudy, '.case__title')
    expect(title).toMatch(/position:\s*relative/u)
    expect(title).not.toMatch(/sticky/u)
    expect(title).not.toMatch(/fixed/u)
    expect(title).toMatch(/min-block-size:\s*var\(--case-title-h, auto\)/u)
    expect(blocks(caseStudy, '.case__title-text')[0]).toMatch(/font-size:\s*var\(--text-project-title\)/u)
  })

  it('the drift lives only on the marquee track, and a fitting title falls back to plain text', () => {
    const [track] = blocks(caseStudy, '.case__marquee-track')
    expect(track).toMatch(/will-change:\s*transform/u)
    expect(track).toMatch(/gap:\s*var\(--marquee-gap\)/u)
    expect(track).toMatch(/inline-size:\s*max-content/u)
    expect(caseStudy).toMatch(/\.case\[data-marquee='false'\] \.case__title-text\s*\{[^}]*white-space:\s*normal/u)
  })

  it('the stage carries the entrance and the exit, never the resting layout', () => {
    const [stage] = blocks(caseStudy, '.case__stage')
    expect(stage).toMatch(/will-change:\s*transform/u)
    expect(stage).not.toMatch(/transform:/u)
  })

  it('reduced motion means the resting frame itself, not a shortened animation', () => {
    const reduced = mediaQueries(caseStudy).get('(prefers-reduced-motion: reduce)')?.join('\n') ?? ''
    expect(reduced).toMatch(/\.case__title,[^}]*\.case__marquee-track\s*\{[^}]*transform:\s*none !important/u)
    expect(reduced).toMatch(/transition-duration:\s*0\.001ms !important/u)
  })

  it('locks the page behind the panel with a token the component owns', () => {
    expect(caseStudy).toMatch(/html\[data-case-open='true'\],[^}]*\{[^}]*overflow:\s*hidden/u)
  })

  it('month-metrics of the reveal exist once, as tokens the JS engine reads', () => {
    expect(px(tokens, '--marquee-speed')).toBe(44)
    expect(tokens).toMatch(/--dur-title: 1000ms/u)
    expect(tokens).toMatch(/--dur-stage: 1150ms/u)
    expect(tokens).toMatch(/--z-panel: 60/u)
    expect(tokens).toMatch(/--z-controls: 20/u)
    expect(tokens).toMatch(/--z-menu: 30/u)
    expect(tokens).toMatch(/--text-project-title:/u)
  })
})

describe('theme tokens the CMS also writes', () => {
  it("keeps the design's square corners when a tenant theme sets a radius", () => {
    expect(tokens).toMatch(/--radius-square:\s*0px/u)
    const rule = tokens.match(/html body \{\s*--radius: var\(--radius-square\);\s*\}/u)
    expect(rule, 'the radius re-assertion is missing').toBeTruthy()
    const code = tokens.replace(/\/\*[\s\S]*?\*\//gu, '')
    expect(code).toMatch(/html body \{\s*--radius: var\(--radius-square\);\s*\}/u)
  })

  it('ships no hardcoded reference identity in production source', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`
        if (entry.isDirectory()) walk(full)
        else if (/\.(?:ts|tsx|css)$/u.test(entry.name) && /estudiobang/iu.test(read(full))) offenders.push(full)
      }
    }
    walk('src')
    expect(offenders).toEqual([])
  })
})

describe('overlays', () => {
  it('give the lightbox its own full-page backdrop in the agreed opacity range', () => {
    const [overlay] = blocks(components, '.lightbox__overlay')
    expect(overlay).toContain('position: fixed')
    expect(overlay).toContain('inset: 0')
    const alpha = Number(overlay!.match(/rgba\(0,\s*0,\s*0,\s*(0?\.\d+)\)/u)?.[1])
    expect(alpha).toBeGreaterThanOrEqual(0.45)
    expect(alpha).toBeLessThanOrEqual(0.55)
    const [layer] = blocks(components, '.lightbox')
    expect(Number(layer!.match(/z-index:\s*(\d+)/u)?.[1])).toBeGreaterThan(Number(overlay!.match(/z-index:\s*(\d+)/u)?.[1]))
  })

  it("leave the navigation drawer's wash untouched", () => {
    const [drawer] = blocks(components, '.drawer__overlay')
    expect(drawer).toContain('rgba(0, 0, 0, 0.25)')
  })
})

describe('navbar and logo sizing', () => {
  it("sets the chrome from tokens inside the agreed ranges per breakpoint", () => {
    const queries = mediaQueries(tokens)
    const base = tokens.slice(0, tokens.indexOf('@media'))
    const tablet = (queries.get('(min-width: 48rem)') ?? []).join('\n')
    const desktop = (queries.get('(min-width: 64rem)') ?? []).join('\n')

    expect(px(base, '--navbar-block')).toBeGreaterThanOrEqual(80)
    expect(px(base, '--navbar-block')).toBeLessThanOrEqual(84)
    expect(px(base, '--logo-block')).toBeGreaterThanOrEqual(40)
    expect(px(base, '--logo-block')).toBeLessThanOrEqual(44)

    expect(px(tablet, '--navbar-block')).toBeGreaterThanOrEqual(86)
    expect(px(tablet, '--navbar-block')).toBeLessThanOrEqual(90)
    expect(px(tablet, '--logo-block')).toBeGreaterThanOrEqual(44)
    expect(px(tablet, '--logo-block')).toBeLessThanOrEqual(48)

    expect(px(desktop, '--navbar-block')).toBeGreaterThanOrEqual(90)
    expect(px(desktop, '--navbar-block')).toBeLessThanOrEqual(96)
    expect(px(desktop, '--logo-block')).toBeGreaterThanOrEqual(48)
    expect(px(desktop, '--logo-block')).toBeLessThanOrEqual(54)
  })

  it('drives the navbar and the logo from those tokens, with no fixed pixel height left', () => {
    const [navbar] = blocks(components, '.navbar__inner')
    expect(navbar).toContain('min-block-size: var(--navbar-block)')
    expect(components).not.toMatch(/min-block-size:\s*68px/u)

    const [logo] = blocks(components, '.navbar__logo')
    expect(logo).toContain('block-size: var(--logo-block)')
    expect(logo).toMatch(/inline-size:\s*auto/u)
    expect(logo).toMatch(/object-fit:\s*contain/u)
    expect(read('src/components/layout/Logo.tsx')).not.toMatch(/\bh-8\b|height=\{?["']?32/u)
  })
})

describe('prose media grids', () => {
  it('a grid inside prose is layout, not a list: no markers, no list indent, no staggered cells', () => {
    const [reset] = blocks(typography, '.prose .grid-media')
    expect(reset).toMatch(/list-style:\s*none/u)
    expect(reset).toMatch(/padding:\s*0/u)
    const spacing = typography.match(/\.prose \.grid-media > li \+ li\s*\{([^}]*)\}/u)?.[1]
    expect(spacing).toMatch(/margin-block-start:\s*0/u)
  })

  it('only text is held to the reading measure; figures use the column width', () => {
    expect(typography).toMatch(/\.prose > :where\([^)]*\bp\b[^)]*\)\s*\{[^}]*max-inline-size:\s*var\(--measure-prose\)/u)
    const [prose] = blocks(typography, '.prose')
    expect(prose ?? '').not.toContain('max-inline-size')
  })

  it('a single named image uses the same label row, as wide as its frame may be', () => {
    expect(components).toContain('.media-titled--content > .media-grid__head {')
    expect(components).toContain('.media-titled--narrow > .media-grid__head {')
  })

  it('the named-grid label has a title, a rule and a count', () => {
    for (const part of ['.media-grid__head', '.media-grid__title', '.media-grid__rule', '.media-grid__count']) {
      expect(components).toContain(`${part} {`)
    }
  })
})

describe('section navigation', () => {
  it('is a rail only for hover-capable desktops, a button + panel everywhere else', () => {
    const queries = [...mediaQueries(components).entries()].filter(([condition]) => condition.includes('hover: hover'))
    expect(queries.map(([condition]) => condition)).toEqual(['(min-width: 64rem) and (hover: hover)'])
    const rail = queries[0]![1].join('\n')
    expect(rail).toMatch(/\.secnav__toggle\s*\{[^}]*display:\s*none/u)
    expect(rail).toMatch(/\.secnav:hover,\s*\.secnav:has\(:focus-visible\)\s*\{/u)
  })

  it('has no shadows or rounded corners', () => {
    const start = components.indexOf('/* --- in-page navigation (SectionNav)')
    const end = components.indexOf('/* --- mobile drawer')
    const nav = components.slice(start, end)
    expect(nav).not.toMatch(/box-shadow|border-radius/u)
  })
})

describe('short description typography', () => {
  it('is a supporting voice: smaller than body copy, light, secondary ink, airy', () => {
    const [summary] = blocks(typography, '.type-summary')
    expect(summary).toMatch(/font-size:\s*var\(--text-summary\)/u)
    expect(summary).toMatch(/font-weight:\s*var\(--weight-light\)/u)
    expect(summary).toMatch(/color:\s*var\(--ink-secondary\)/u)
    expect(summary).toMatch(/max-inline-size:\s*var\(--measure-lede\)/u)
    expect(summary).toMatch(/text-wrap:\s*pretty/u)
    expect(Number.parseFloat(tokens.match(/--text-summary:\s*([\d.]+)rem/u)![1]!)).toBeLessThan(1)
    expect(Number(tokens.match(/--leading-summary:\s*([\d.]+)/u)![1])).toBeGreaterThan(Number(tokens.match(/--leading-body:\s*([\d.]+)/u)![1]))
  })
})
