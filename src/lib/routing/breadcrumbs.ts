import type { Locale, SiteDescriptor } from '@/lib/cms/types'
import { href } from './locale'
import { THEME_ROUTES } from './paths'
import type { ResolvedRoute } from './resolve'

/**
 * Breadcrumb trail for a resolved route.
 *
 * Labels are the theme's own (`chrome only, content lives in CMS`): the archive is a
 * route the theme owns, so its name is a UI string. The leaf of a case study is the
 * document title, passed in by the view — never invented here.
 */
export type Crumb = { current?: boolean; href?: string; label: string }

const LABELS: Record<Locale, Record<string, string>> = {
  fa: { about: 'درباره ما', contact: 'تماس', home: 'خانه', projects: 'نمونه‌کارها' },
  en: { about: 'About', contact: 'Contact', home: 'Home', projects: 'Work' },
}

export const sectionLabel = (key: keyof (typeof LABELS)['fa'], locale: Locale): string =>
  LABELS[locale][key] ?? String(key)

export const breadcrumbsFor = (
  route: ResolvedRoute,
  site: Pick<SiteDescriptor, 'defaultLocale'>,
  leaf?: null | string,
): Crumb[] => {
  const t = (key: string) => sectionLabel(key as keyof (typeof LABELS)['fa'], route.locale)
  const home: Crumb = { href: href(THEME_ROUTES.home, route.locale, site), label: t('home') }
  const archive = (section: 'about' | 'contact' | 'projects'): Crumb[] => [
    home,
    { current: true, label: t(section) },
  ]
  const detail = (sectionPath: string): Crumb[] => [
    home,
    { href: href(sectionPath, route.locale, site), label: t('projects') },
    { current: true, label: leaf ?? '' },
  ]

  switch (route.kind) {
    case 'projects':
      return archive('projects')
    case 'project':
      return detail(THEME_ROUTES.projects)
    case 'about':
      return archive('about')
    case 'contact':
      return archive('contact')
    case 'page':
      return [home, { current: true, label: leaf ?? route.slug }]
    default:
      return [home]
  }
}
