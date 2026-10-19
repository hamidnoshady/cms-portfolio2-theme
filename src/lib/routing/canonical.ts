import 'server-only'
import type { SiteContext } from '@/lib/cms/context'
import { getSectionRef, getPostContext } from '@/lib/cms/content'
import { getPageBySlug } from '@/lib/cms/endpoints'
import { href } from './locale'
import { THEME_ROUTES } from './paths'
import type { ResolvedRoute } from './resolve'

/** One canonical URL per document. Skipped in preview so editors can open by slug. */
export const canonicalRedirect = async (route: ResolvedRoute, ctx: SiteContext): Promise<null | string> => {
  if (ctx.draft) return null
  if (route.kind === 'page') {
    const page = await getPageBySlug(route.slug, ctx.locale, ctx.draft)
    if (!page) return null
    const id = String(page.id)
    const table: Array<[string, string]> = [
      ['home', THEME_ROUTES.home], ['about', THEME_ROUTES.about], ['contact', THEME_ROUTES.contact],
    ]
    for (const [section, path] of table) {
      const ref = getSectionRef(section as never, ctx)
      if (ref.by === 'binding' && ref.id === id) return href(path, ctx.locale, ctx.site)
    }
    return null
  }
  if (route.kind === 'project') {
    const data = await getPostContext(route.slug, ctx)
    if (!data) return null
    // Work outside the bound `projectsCategory` has no canonical route: the archive the
    // theme owns is `/projects/<slug>`, and an orphan must not be published twice.
    if (data.section === 'projects') return null
    return href(`${THEME_ROUTES.projects}/${encodeURIComponent(route.slug)}`, ctx.locale, ctx.site)
  }
  return null
}
