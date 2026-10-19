import type { Metadata } from 'next'

import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Mosaic, type MosaicWork } from '@/components/mosaic/Mosaic'
import { EmptyState, ErrorState } from '@/components/states/States'
import { toMosaicFields } from '@/domain/portfolio'
import { getArchive, getBoundPost, localizedPostHref } from '@/lib/cms/content'
import { loadPageContext } from '@/lib/cms/pageContext'
import type { CategoryDoc, Locale, PostDoc } from '@/lib/cms/types'
import { href } from '@/lib/routing/locale'
import { THEME_ROUTES } from '@/lib/routing/paths'
import { planMosaic } from '@/lib/portfolio/mosaicPlan'
import { positionLabel } from '@/lib/portfolio/reveal'
import { metadataFor } from '@/lib/seo/metadata'
import { brandName } from '@/lib/theme/brand'
import { getChrome } from '@/lib/theme/chrome'
import { labels as dictionary } from '@/lib/theme/labels'
import { resolveThemeSettings } from '@/lib/theme/settings'
import { formatNumber } from '@/lib/runtime'
import { StateView } from '@/views/StateView'

/**
 * Home is the mosaic. There is no hero, no slider and no "welcome" copy the CMS cannot
 * remove: the strongest thing a portfolio can open with is the work itself.
 *
 * The one piece of framing above the grid is the site's own identity (branding, not
 * invented copy) plus how many works are published — the header line the prototype had,
 * fed by `/api/site` and the archive count instead of a JSON file.
 */

export type ArchiveStatus = 'ready' | 'empty' | 'error'

/** Three outcomes, decided in one place so the empty state and the error state never swap. */
export const classifyArchiveOutcome = ({ failed, count }: { count: number; failed: boolean }): ArchiveStatus => {
  if (count > 0) return 'ready'
  return failed ? 'error' : 'empty'
}

/** A populated first category wins the kicker line; ids at `depth: 0` are not a label. */
export const categoryLabel = (post: PostDoc): null | string => {
  const first = (post.categories ?? []).find((value): value is CategoryDoc => typeof value === 'object' && value !== null)
  const title = typeof first?.title === 'string' ? first.title.trim() : ''
  return title || null
}

export const homeMetadata = async (locale: Locale): Promise<Metadata> => {
  const outcome = await loadPageContext(locale, '/')
  if (!outcome.ok) return { robots: { follow: false, index: false } }
  const ctx = outcome.ctx
  return metadataFor({
    context: ctx,
    description: ctx.site.branding?.tagline ?? null,
    path: '/',
    title: brandName(ctx.site),
  })
}

export const HomeView = async ({ locale }: { locale: Locale }) => {
  const outcome = await loadPageContext(locale, '/')
  if (!outcome.ok) return <StateView locale={locale} outcome={outcome} />
  const ctx = outcome.ctx
  const t = dictionary(locale)
  const settings = resolveThemeSettings(ctx.site)
  const chrome = await getChrome(ctx, '/')

  const [archive, lead] = await Promise.all([
    getArchive(ctx, { limit: settings.homeTiles, section: 'projects' })
      .then((result) => ({ failed: false, result }))
      .catch(() => ({ failed: true, result: null })),
    getBoundPost('leadWork', ctx).catch(() => null),
  ])

  const posts = archive.result?.docs ?? []
  const totalDocs = archive.result?.totalDocs ?? posts.length
  const status = classifyArchiveOutcome({ count: posts.length, failed: archive.failed })

  // The composition is decided before the reads: spans depend only on how many tiles
  // there are and which work the operator pinned as the lead.
  const planned = planMosaic(posts, {
    idOf: (post) => String(post.id),
    leadId: lead ? String(lead.id) : null,
    plan: settings.mosaicPlan,
  })

  const works: MosaicWork[] = await Promise.all(
    planned.map(async ({ item: post, span }, position) => ({
      ...toMosaicFields(post, { categoryLabel: categoryLabel(post) }),
      href: await localizedPostHref(post, ctx),
      position,
      span,
    })),
  )

  const browseHref = href(THEME_ROUTES.projects, locale, ctx.site)
  const brand = brandName(ctx.site)

  return (
    <div className="p2-home flex min-h-svh flex-col" id="p2-home">
      <a className="skip-link" href="#p2-work">
        {t.selectedWork}
      </a>

      <SiteHeader
        context={ctx}
        floating
        links={chrome.headerLinks}
        logo={chrome.logo}
        switchTargets={chrome.switchTargets}
      />

      <main className="flex-1" id="content">
        <div className="shell flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-line-structural py-6">
          <p className="type-label" dir="auto">
            {brand}
            {ctx.site.branding?.tagline ? <span className="text-ink-secondary"> — {ctx.site.branding.tagline}</span> : null}
          </p>
          {status === 'ready' ? (
            <p className="type-meta text-ink-secondary">
              <span className="tabular-nums">{positionLabel(0, totalDocs).split(' / ')[1]}</span> ·{' '}
              {t.selectedWorkCount(totalDocs)}{' '}
              {totalDocs > works.length ? `(${t.selectedWorkShown(works.length, totalDocs)})` : null}
            </p>
          ) : null}
        </div>

        {status === 'ready' ? (
          <section aria-labelledby="p2-work-heading" id="p2-work">
            <h1 className="sr-only" id="p2-work-heading">
              {t.selectedWork}
            </h1>
            <Mosaic
              items={works}
              labels={{ openWork: t.openWork, region: t.selectedWork }}
              origin={ctx.site.media.origin}
              total={totalDocs}
            />
            {totalDocs > works.length ? (
              <div className="shell py-6">
                <a className="link-inline type-ui" href={browseHref}>
                  {t.browseProjects} · {formatNumber(totalDocs, locale)}
                </a>
              </div>
            ) : null}
          </section>
        ) : status === 'error' ? (
          <div className="shell py-16">
            <ErrorState locale={locale} />
          </div>
        ) : (
          <div className="shell py-16">
            <EmptyState
              action={{ href: browseHref, label: t.browseProjects }}
              body={t.emptyArchiveBody}
              locale={locale}
              title={t.emptyArchiveTitle}
            />
          </div>
        )}
      </main>

      <div className="p2-corner-lang">
        <LanguageSwitch current={locale} hrefs={chrome.switchTargets} label={t.languageSwitch} />
      </div>
    </div>
  )
}
