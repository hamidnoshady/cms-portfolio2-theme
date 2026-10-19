/**
 * One canonical route builder for the theme.
 *
 * Navigation, the mosaic, the case study, related work, the language switch, metadata,
 * the sitemap, previews and redirects all ask this file — a URL that is built twice is a
 * URL that drifts. `/projects` is deliberate: `docs/THEME_API.md` §2 reserves
 * `/posts…` on the CMS, so a theme that renders work of its own owns a different segment
 * and the reserved one is redirected (see `resolve.ts`, `proxy.ts`).
 */

export const THEME_ROUTES = {
  home: '/',
  about: '/about',
  contact: '/contact',
  projects: '/projects',
} as const

/**
 * The theme has one body of work. The type stays a union so the archive/case-study
 * helpers keep their `section` argument — a second collection (say `objects`) is a
 * manifest slot plus one route, not a rewrite.
 */
export type PortfolioSection = 'projects'

export const PORTFOLIO_SECTIONS: readonly PortfolioSection[] = ['projects']

export const archivePath = (section: PortfolioSection = 'projects'): string => {
  void section
  return THEME_ROUTES.projects
}

export const detailPath = (section: PortfolioSection, slug: string): string =>
  `${archivePath(section)}/${encodeURIComponent(slug)}`

export const projectsPath = (): string => THEME_ROUTES.projects
export const projectPath = (slug: string): string => detailPath('projects', slug)

export const pageQueryParam = (page: number): string => (page > 1 ? `?page=${page}` : '')

/** Paths the theme owns outright; a CMS page slug may never shadow one of these. */
export const RESERVED_PATHS = ['about', 'contact', 'projects', 'api', '_next'] as const
