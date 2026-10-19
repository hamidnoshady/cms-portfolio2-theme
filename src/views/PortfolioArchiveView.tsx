import type { Metadata } from 'next'

import { ContentContainer } from '@/components/design/Container'
import { Pagination } from '@/components/design/Pagination'
import { Mosaic, type MosaicWork } from '@/components/mosaic/Mosaic'
import { EmptyState } from '@/components/states/States'
import { toMosaicFields } from '@/domain/portfolio'
import { getArchive, getBoundPost, localizedPostHref } from '@/lib/cms/content'
import { loadPageContext } from '@/lib/cms/pageContext'
import type { Locale } from '@/lib/cms/types'
import { breadcrumbsFor } from '@/lib/routing/breadcrumbs'
import { archivePath, pageQueryParam, type PortfolioSection } from '@/lib/routing/paths'
import { resolveLocaleRoute } from '@/lib/routing/resolve'
import { planMosaic } from '@/lib/portfolio/mosaicPlan'
import { metadataFor } from '@/lib/seo/metadata'
import { brandName } from '@/lib/theme/brand'
import { labels as dictionary } from '@/lib/theme/labels'
import { resolveThemeSettings } from '@/lib/theme/settings'
import { InteriorPage } from '@/views/InteriorPage'
import { StateView } from '@/views/StateView'
import { categoryLabel } from '@/views/HomeView'

/**
 * The full index of work: the same mosaic as the home page, paginated, with the
 * operator's bound lead work pinned to the first row on page 1 only. Pagination is a
 * `?page=` query on one route, so a middle-click and a shared link behave.
 */

export const parseArchivePage = (value: string | string[] | undefined): number => {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw ?? '1'), 10)
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1
}

export const archiveMetadata = async (locale: Locale, section: PortfolioSection): Promise<Metadata> => {
  const path = archivePath(section)
  const outcome = await loadPageContext(locale, path)
  if (!outcome.ok) return { robots: { follow: false, index: false } }
  const t = dictionary(locale)
  return metadataFor({
    context: outcome.ctx,
    description: null,
    path,
    title: `${t.projects} — ${brandName(outcome.ctx.site)}`,
  })
}

export const PortfolioArchiveView = async ({
  locale,
  page,
  pageParam,
  section,
}: {
  locale: Locale
  page?: number
  pageParam?: string | string[]
  section: PortfolioSection
}) => {
  const path = archivePath(section)
  const outcome = await loadPageContext(locale, path)
  if (!outcome.ok) return <StateView locale={locale} outcome={outcome} />
  const ctx = outcome.ctx
  const t = dictionary(locale)
  const currentPage = page ?? parseArchivePage(pageParam)
  const settings = resolveThemeSettings(ctx.site)

  // The lead is a composition device for the opening page; repeating it on page 3 would
  // be a lie about the archive's order.
  const [archive, lead] = await Promise.all([
    getArchive(ctx, { limit: settings.archiveTiles, page: currentPage, section }),
    currentPage === 1 ? getBoundPost('leadWork', ctx).catch(() => null) : Promise.resolve(null),
  ])

  const route = resolveLocaleRoute([section], locale, ctx.site)
  const crumbs = breadcrumbsFor(route, ctx.site)
  const startNumber = ((archive.page ?? currentPage) - 1) * settings.archiveTiles + 1

  const planned = planMosaic(archive.docs, {
    idOf: (post) => String(post.id),
    leadId: lead ? String(lead.id) : null,
    plan: settings.mosaicPlan,
  })

  const works: MosaicWork[] = await Promise.all(
    planned.map(async ({ item: post, span }, index) => ({
      ...toMosaicFields(post, { categoryLabel: categoryLabel(post) }),
      href: await localizedPostHref(post, ctx),
      // Page 2 continues the sequence rather than restarting at 01, so the numerals
      // describe the archive and not the page.
      position: startNumber - 1 + index,
      span,
    })),
  )

  return (
    <InteriorPage
      context={ctx}
      crumbs={crumbs}
      currentPath={path}
      label={t.breadcrumb}
      switchQuery={pageQueryParam(archive.page ?? currentPage)}
    >
      <ContentContainer className="py-8">
        <h1 className="type-title mb-2" dir="auto">
          {t.projects}
        </h1>
        <p className="type-meta mb-8 text-ink-secondary">{t.selectedWorkCount(archive.totalDocs ?? works.length)}</p>

        {works.length === 0 ? (
          <EmptyState body={t.emptyArchiveBody} locale={locale} title={t.emptyArchiveTitle} />
        ) : (
          <>
            <Mosaic
              items={works}
              labels={{ openWork: t.openWork, region: t.projects }}
              origin={ctx.site.media.origin}
              total={archive.totalDocs ?? works.length}
            />
            <Pagination
              basePath={path}
              currentPage={archive.page ?? currentPage}
              label={t.breadcrumb}
              labels={{ next: t.next, previous: t.previous }}
              locale={locale}
              totalPages={archive.totalPages ?? 1}
            />
          </>
        )}
      </ContentContainer>
    </InteriorPage>
  )
}
