import type { Locale, SiteDescriptor } from '@/lib/cms/types'
import { splitLocale } from './locale'

/**
 * Path → route. Pure and shared by metadata, page bodies, the sitemap and redirects,
 * so a canonical URL cannot drift from what renders.
 *
 * `alias` exists because the CMS reserves `/posts…` for its own preview links: a theme
 * that renders the same documents at `/projects…` has to say so in one place, and both
 * `src/proxy.ts` (a real 307) and the page (a redirect call) read it from here.
 */
export type ThemeRoute =
  | { kind: 'home' }
  | { kind: 'about' }
  | { kind: 'contact' }
  | { kind: 'projects'; page: number }
  | { kind: 'project'; slug: string }
  | { kind: 'page'; slug: string }
  | { kind: 'alias'; to: string }
  | { kind: 'notFound'; reason: 'empty' | 'reserved' | 'unsupported-locale'; detail?: string }

export type ResolvedRoute = ThemeRoute & { explicitLocale: boolean; locale: Locale }

const pageNumber = (value: null | string | undefined): number => {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export const resolveThemeRoute = (
  segments: string[],
  site: Pick<SiteDescriptor, 'availableLocales' | 'defaultLocale'>,
  search: { page?: null | string; q?: null | string } = {},
): ResolvedRoute => {
  const split = splitLocale(segments, site)
  if ('unsupported' in split) {
    return { explicitLocale: true, kind: 'notFound', locale: site.defaultLocale, reason: 'unsupported-locale', detail: split.unsupported }
  }
  const base = { explicitLocale: split.explicit, locale: split.locale }
  const [head, second] = split.rest
  if (!head) return { ...base, kind: 'home' }
  // `/home` is the conventional slug for the homepage document; the theme's home is `/`.
  if (head === 'home' && !second) return { ...base, kind: 'alias', to: '/' }
  // The CMS contract reserves `/posts…`; work is served at `/projects…`.
  if (head === 'posts') {
    return {
      ...base,
      kind: 'alias',
      to: second ? `/projects/${encodeURIComponent(decodeURIComponent(second))}` : '/projects',
    }
  }
  switch (head) {
    case 'projects':
      return second
        ? { ...base, kind: 'project', slug: decodeURIComponent(second) }
        : { ...base, kind: 'projects', page: pageNumber(search.page) }
    case 'about':
      return second ? { ...base, kind: 'notFound', reason: 'empty' } : { ...base, kind: 'about' }
    case 'contact':
      return second ? { ...base, kind: 'notFound', reason: 'empty' } : { ...base, kind: 'contact' }
    default: {
      if (split.rest.length > 1) return { ...base, kind: 'notFound', reason: 'empty' }
      return { ...base, kind: 'page', slug: decodeURIComponent(head) }
    }
  }
}

export const resolveLocaleRoute = (
  segments: string[],
  locale: Locale,
  site: Pick<SiteDescriptor, 'availableLocales' | 'defaultLocale'>,
  search?: { page?: null | string; q?: null | string },
): ResolvedRoute => resolveThemeRoute(locale === site.defaultLocale ? segments : [locale, ...segments], site, search)

/** Sections whose own slug may arrive through the catch-all and must redirect home. */
export const CANONICAL_SECTION_SLUGS = ['about', 'contact', 'projects'] as const
