// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DecorativeMark } from '@/components/design/DecorativeMark'
import { Pagination } from '@/components/design/Pagination'
import { Rule } from '@/components/design/Rule'
import { LanguageSwitch, switchEntries } from '@/components/layout/LanguageSwitch'
import { Logo } from '@/components/layout/Logo'
import { Skeleton } from '@/components/ui/skeleton'
import type { SiteContext } from '@/lib/cms/context'
import type { Locale, SiteDescriptor } from '@/lib/cms/types'
import type { SwitchTarget } from '@/lib/seo/translations'

/**
 * The line system's accessibility contract: decorations are never interactive, never
 * announced and never part of the layout tree that shifts; structural rules carry no
 * content of their own.
 */
describe('DecorativeMark', () => {
  it('is hidden from assistive technology and cannot be focused or clicked', () => {
    const { container } = render(<DecorativeMark variant="crosshair" />)
    const mark = container.querySelector('[data-mark="crosshair"]')
    expect(mark).not.toBeNull()
    expect(mark?.getAttribute('aria-hidden')).toBe('true')
    expect(mark?.querySelector('svg')?.getAttribute('stroke')).toBe('currentColor')
    expect(mark?.querySelector('svg')?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
  })

  it('renders all six documented variants deterministically', () => {
    const variants = ['corner', 'crosshair', 'dash', 'offset-l', 'pair', 'tick'] as const
    for (const variant of variants) {
      const { container } = render(<DecorativeMark variant={variant} />)
      expect(container.querySelector(`[data-mark="${variant}"]`)).not.toBeNull()
    }
  })
})

describe('structural rules', () => {
  it('are presentational only', () => {
    const { container } = render(<Rule />)
    const rule = container.querySelector('.rule-h')
    expect(rule).not.toBeNull()
    expect(rule?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.rule-h--emphasis')).toBeNull()
    const { container: emphasised } = render(<Rule tone="emphasis" />)
    expect(emphasised.querySelector('.rule-h--emphasis')).not.toBeNull()
  })
})

describe('Skeleton', () => {
  it('hides placeholder geometry from screen readers', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />)
    const skeleton = container.querySelector('.skeleton')
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('Pagination', () => {
  it('keeps the localized base path when paging an English archive', () => {
    const { container } = render(
      <Pagination
        basePath="/en/projects"
        currentPage={1}
        label="Pagination"
        labels={{ next: 'Next', previous: 'Previous' }}
        locale="en"
        totalPages={3}
      />,
    )
    const hrefs = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'))
    // Every control — first page, page numbers and next — stays under the English tree.
    expect(hrefs.every((href) => href?.startsWith('/en/projects'))).toBe(true)
    expect(hrefs).toContain('/en/projects?page=2')
    expect(hrefs).toContain('/en/projects?page=3')
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination')
  })

  it('formats page numbers in the locale digits and preserves the filter query', () => {
    const { container } = render(
      <Pagination
        basePath="/projects"
        currentPage={1}
        label="صفحه‌بندی"
        labels={{ next: 'بعدی', previous: 'پیشین' }}
        locale="fa"
        query="?category=residential"
        totalPages={3}
      />,
    )
    const next = container.querySelector('a[href="/projects?category=residential&page=2"]')
    expect(next?.textContent).toBe('۲')
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('صفحه‌بندی')
  })
})

/**
 * Chrome components that the UI/UX refactor pinned down: the language switch names
 * only the other language and never fabricates a link; the logo is sized by the
 * design system, not by a hard-coded pixel height; the project facts block renders
 * exactly the fields the CMS returned.
 */
const siteContext = (locale: Locale, branding?: Record<string, unknown>): SiteContext =>
  ({
    canonicalOrigin: 'https://example.test',
    deploymentOrigin: 'https://example.test',
    dir: locale === 'fa' ? 'rtl' : 'ltr',
    draft: false,
    locale,
    serving: true,
    site: {
      availableLocales: ['fa', 'en'] as Locale[],
      branding: branding ?? null,
      defaultLocale: 'fa' as Locale,
      id: 'site-fixture',
      locales: ['fa', 'en'] as Locale[],
      media: { origin: 'https://example.test' },
      name: 'استودیوی نمونه',
      themeRuntime: { bindings: {}, settings: {} },
    } as unknown as SiteDescriptor,
  }) satisfies SiteContext

describe('LanguageSwitch', () => {
  const targets: SwitchTarget[] = [
    { href: '/projects/villa', label: 'FA', locale: 'fa', name: 'فارسی' },
    { href: '/en/projects/villa', label: 'EN', locale: 'en', name: 'English' },
  ]

  it('prints the set of languages with the one being read marked, as the reference does', () => {
    const { container } = render(<LanguageSwitch current="fa" hrefs={targets} label="زبان" />)
    const links = [...container.querySelectorAll('a')]
    // Every language is present; only the *other* one is a link, so the control cannot
    // navigate to the page the visitor is already on.
    expect(links.map((link) => link.textContent)).toEqual(['EN'])
    expect(links[0]?.getAttribute('href')).toBe('/en/projects/villa')
    expect(links[0]?.getAttribute('hreflang')).toBe('en')
    // The code is compact, the accessible name is the language's own name.
    expect(links[0]?.getAttribute('aria-label')).toBe('English')
    const current = container.querySelector('[data-current="true"]')
    expect(current?.textContent).toBe('FA')
    expect(current?.getAttribute('aria-current')).toBe('true')
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('زبان')
  })

  it('marks Persian on an English page, and never links to itself', () => {
    const { container } = render(<LanguageSwitch current="en" hrefs={targets} label="Language" />)
    expect([...container.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['FA'])
    expect(container.querySelector('[data-current="true"]')?.textContent).toBe('EN')
  })

  it('shows a missing translation as quiet text, never as a link or a redirect home', () => {
    const { container } = render(
      <LanguageSwitch
        current="fa"
        hrefs={[
          { href: '/projects/villa', label: 'FA', locale: 'fa', name: 'فارسی' },
          { href: null, label: 'EN', locale: 'en', name: 'English' },
        ]}
        label="زبان"
      />,
    )
    expect(container.querySelector('a')).toBeNull()
    const unavailable = container.querySelector('[data-translation="missing"]')
    expect(unavailable?.textContent).toBe('EN')
    expect(unavailable?.getAttribute('aria-disabled')).toBe('true')
    expect(unavailable?.getAttribute('lang')).toBe('en')
    expect(container.textContent).not.toContain('/en')
  })

  it('renders nothing when the site serves a single language', () => {
    const { container } = render(<LanguageSwitch current="fa" hrefs={[targets[0]!]} label="زبان" />)
    expect(container.firstChild).toBeNull()
  })

  it('keeps the CMS order, so the chrome does not reshuffle when the language changes', () => {
    // The old implementation compared `entry.label === current`, which never matched.
    expect(switchEntries(targets).map((entry) => entry.locale)).toEqual(['fa', 'en'])
  })
})

describe('Logo', () => {
  const media = (id: string) => ({ height: 64, id, mimeType: 'image/svg+xml', url: `/media/${id}.svg`, width: 64 })

  it('is sized by the design system class, not a hard-coded 32px height', () => {
    const context = siteContext('fa', { logo: media('logo') })
    const { container } = render(<Logo context={context} mark={{ compact: 'https://example.test/media/logo.svg', primary: 'https://example.test/media/logo.svg' }} />)
    const img = container.querySelector('img[data-logo="mark"]')
    expect(img).not.toBeNull()
    expect(img?.classList.contains('navbar__logo')).toBe(true)
    expect(img?.className).not.toMatch(/\bh-8\b/u)
    expect(img?.getAttribute('height')).toBeNull()
    expect(img?.getAttribute('width')).toBeNull()
    // One asset → one image; no `<picture>` pretending there are two.
    expect(container.querySelector('picture')).toBeNull()
  })

  it('prefers the primary mark on desktop and the compact mark where space is limited', () => {
    const context = siteContext('en', { compactLogo: media('compact'), primaryLogo: media('primary') })
    const { container } = render(
      <Logo context={context} mark={{ compact: 'https://example.test/media/compact.svg', primary: 'https://example.test/media/primary.svg' }} />,
    )
    const source = container.querySelector('picture > source')
    expect(source?.getAttribute('media')).toBe('(min-width: 64rem)')
    expect(source?.getAttribute('srcset')).toBe('https://example.test/media/primary.svg')
    expect(container.querySelector('picture > img')?.getAttribute('src')).toBe('https://example.test/media/compact.svg')
    expect(container.querySelector('picture > img')?.classList.contains('navbar__logo')).toBe(true)
  })

  it('falls back to the site name as a wordmark with no mark element at all', () => {
    const { container } = render(<Logo context={siteContext('fa')} mark={{ compact: null, primary: null }} />)
    expect(container.querySelector('[data-logo="mark"]')).toBeNull()
    expect(container.querySelector('[data-logo="wordmark"]')?.textContent).toBe('استودیوی نمونه')
  })
})



