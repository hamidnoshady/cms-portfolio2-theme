import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { RichText } from '@/components/blocks/RichText'
import { CaseStudyPanel } from '@/components/case/CaseStudyPanel'
import { ContentContainer } from '@/components/design/Container'
import { CmsForm } from '@/components/forms/CmsForm'
import { CmsImage } from '@/components/media/CmsImage'
import { ShareButton } from '@/components/portfolio/ShareButton'
import { toCaseStudy, type CaseStudy } from '@/domain/portfolio'
import { getArchive, getPostContext, localizedPostHref } from '@/lib/cms/content'
import { getFormById } from '@/lib/cms/endpoints'
import { loadPageContext } from '@/lib/cms/pageContext'
import type { Locale, PostDoc, ProjectMetadata, SiteDescriptor } from '@/lib/cms/types'
import { breadcrumbsFor } from '@/lib/routing/breadcrumbs'
import { href } from '@/lib/routing/locale'
import { archivePath, detailPath, THEME_ROUTES, type PortfolioSection } from '@/lib/routing/paths'
import { resolveLocaleRoute } from '@/lib/routing/resolve'
import { planMosaic } from '@/lib/portfolio/mosaicPlan'
import { positionLabel } from '@/lib/portfolio/reveal'
import { toLocaleDigits } from '@/lib/runtime'
import { metadataFor } from '@/lib/seo/metadata'
import { documentLanguages } from '@/lib/seo/translations'
import { labels as dictionary } from '@/lib/theme/labels'
import { resolveThemeSettings } from '@/lib/theme/settings'
import { yearOrText } from '@/lib/utils/dates'
import { isMedia } from '@/lib/utils/media'
import { InteriorPage } from '@/views/InteriorPage'
import { categoryLabel } from '@/views/HomeView'
import { toMosaicFields } from '@/domain/portfolio'
import { StateView } from '@/views/StateView'

/**
 * One work, two presentations, one markup tree.
 *
 * - `variant="page"` (a direct visit, a refresh, a crawler): the case study is the page —
 *   interior chrome, breadcrumbs, a visible title, and Share as a plain control.
 * - `variant="overlay"` (a click from the mosaic): the *same* content inside
 *   `CaseStudyPanel`, which arms, measures and reveals it over the archive.
 *
 * The overlap is deliberate: a reader who opens a work and then reloads must not land on
 * a different document, and a `noindex` "preview-only" experience is how themes end up
 * with content that does not exist to search.
 */

export const closeHrefForCaseStudy = (
  section: PortfolioSection,
  locale: Locale,
  site: Pick<SiteDescriptor, 'defaultLocale'>,
): string => href(archivePath(section), locale, site)

const FACT_SYNONYMS: Record<string, string> = {
  area: 'area',
  client: 'client',
  collaborator: 'collaborators',
  collaborators: 'collaborators',
  date: 'date',
  location: 'location',
  role: 'role',
  status: 'status',
  type: 'status',
  typology: 'status',
  year: 'date',
  تاریخ: 'date',
  سال: 'date',
  مکان: 'location',
  مساحت: 'area',
  وضعیت: 'status',
  گونه: 'status',
  کارفرما: 'client',
  همکاران: 'collaborators',
  نقش: 'role',
}

const canonicalFactKey = (label: string): string => {
  const normalized = label.trim().toLowerCase()
  return FACT_SYNONYMS[normalized] ?? normalized
}

/**
 * The facts a case study states. Only fields the CMS actually returned are rendered —
 * nothing is inferred from the narrative, and a synonym the editor typed (`سال` for the
 * year) collapses onto the canonical row instead of printing the same fact twice.
 */
export const buildCaseStudyFacts = (
  cs: CaseStudy,
  meta: null | ProjectMetadata | undefined,
  locale: Locale,
): { label: string; value: string }[] => {
  const t = dictionary(locale)
  const out: { label: string; value: string }[] = []
  const seenKeys = new Set<string>()

  const pushFact = (key: string, label: string, rawValue: null | string | undefined): void => {
    const value = rawValue?.trim()
    if (!value || seenKeys.has(key)) return
    seenKeys.add(key)
    out.push({ label, value })
  }

  pushFact('client', t.factClient, cs.collaborators ?? meta?.client)
  pushFact('date', t.factDate, rawYear(cs.year ?? meta?.date, locale))
  pushFact('location', t.factLocation, cs.location ?? meta?.location)
  pushFact('area', t.factArea, meta?.area)
  pushFact('status', t.factStatus, cs.type ?? meta?.status)

  for (const extra of cs.facts) {
    pushFact(canonicalFactKey(extra.label), extra.label.trim(), extra.value)
  }

  return out
}

const rawYear = (value: null | string | undefined, locale: Locale): null | string => {
  const text = yearOrText(value, locale)
  return text ? toLocaleDigits(text, locale) : null
}

/**
 * Where this work sits in the sequence the reader was looking at, and what comes next.
 *
 * Derived from the *planned* mosaic (same lead pinning, same archive page) rather than
 * from `relatedPosts`, so "next project" means the next tile — which is the promise the
 * prototype made and the only ordering a reader can verify.
 */
export const sequenceOf = (
  posts: readonly { id: string | number }[],
  currentId: string,
): { index: number; next: null | string; total: number } => {
  const index = posts.findIndex((post) => String(post.id) === String(currentId))
  if (index < 0) return { index: -1, next: null, total: posts.length }
  const next = posts[(index + 1) % posts.length]
  return { index, next: next ? String(next.id) : null, total: posts.length }
}

export const caseMetadata = async (
  locale: Locale,
  section: PortfolioSection,
  slug: string,
): Promise<Metadata> => {
  const outcome = await loadPageContext(locale, detailPath(section, slug))
  if (!outcome.ok) return { robots: { follow: false, index: false } }
  const data = await getPostContext(slug, outcome.ctx)
  if (!data) return { robots: { follow: false, index: false }, title: undefined }
  const { post } = data
  return metadataFor({
    context: outcome.ctx,
    description: post.meta?.description ?? null,
    image: isMedia(post.meta?.image) ? post.meta.image : isMedia(post.heroImage) ? post.heroImage : null,
    languages: await documentLanguages(outcome.ctx, {
      id: post.id,
      kind: 'post',
      pathFor: (s) => detailPath(section, s),
    }),
    path: detailPath(section, slug),
    title: post.title,
    type: 'article',
  })
}

export const CaseStudyView = async ({
  locale,
  section,
  slug,
  variant = 'page',
}: {
  locale: Locale
  section: PortfolioSection
  slug: string
  variant?: 'overlay' | 'page'
}) => {
  const path = detailPath(section, slug)
  const outcome = await loadPageContext(locale, path)
  if (!outcome.ok) return <StateView locale={locale} outcome={outcome} />
  const ctx = outcome.ctx
  const t = dictionary(locale)
  const data = await getPostContext(slug, ctx)
  if (!data) notFound()
  const { post, related } = data

  // An orphan (in no bound category) has no route here; a work whose canonical section
  // is elsewhere is redirected to it, so one document never has two live URLs.
  if (!ctx.draft && data.section && data.section !== section) {
    redirect(await localizedPostHref(post, ctx))
  }
  if (!ctx.draft && !data.section) notFound()

  const settings = resolveThemeSettings(ctx.site)
  const cs = toCaseStudy(post)
  const route = resolveLocaleRoute([section, slug], locale, ctx.site)
  const crumbs = breadcrumbsFor(route, ctx.site, post.title)
  const hero = isMedia(post.heroImage) ? post.heroImage : null
  const facts = buildCaseStudyFacts(cs, post.projectMetadata, locale)
  const closeHref = closeHrefForCaseStudy(section, locale, ctx.site)
  const shareUrl = `${ctx.canonicalOrigin}${href(path, locale, ctx.site)}`
  const shareLabels = {
    copied: t.copied,
    copyLink: t.copyLink,
    done: t.shareDone,
    failed: t.shareFailed,
    share: t.share,
  }

  const contactFormId = ctx.site.themeRuntime?.bindings?.contactForm?.id ?? null
  const [contactForm, archive] = await Promise.all([
    contactFormId ? getFormById(contactFormId, locale, ctx.draft).catch(() => null) : Promise.resolve(null),
    getArchive(ctx, { limit: settings.archiveTiles, page: 1, section }).catch(() => null),
  ])

  // Same composition the mosaic used, so the sequence matches what was on screen.
  const planned = planMosaic(archive?.docs ?? [], {
    idOf: (item: PostDoc) => String(item.id),
    leadId: null,
    plan: settings.mosaicPlan,
  }).map((entry) => entry.item)
  const sequence = sequenceOf(planned, String(post.id))
  const nextPost = planned.find((candidate) => String(candidate.id) === sequence.next) ?? null

  const stage = (
    <>
      {hero ? (
        <div className="case__media">
          <CmsImage
            alt={cs.title}
            media={hero}
            origin={ctx.site.media.origin}
            priority
            ratio="16 / 9"
            sizes="(min-width:1280px) 70vw, 100vw"
          />
        </div>
      ) : null}

      {facts.length > 0 ? (
        <dl className="case__meta">
          {facts.map((fact) => (
            <div className="case__meta-item" key={fact.label}>
              <dt className="case__meta-key">{fact.label}</dt>
              <dd className="case__meta-value" dir="auto">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {cs.excerpt ? (
        <p className="case__intro" dir="auto">
          {cs.excerpt}
        </p>
      ) : null}

      <div className="case__body">
        {post.content ? (
          <RichText anchorScope="content" content={post.content} context={ctx} fallbackDir={ctx.dir} />
        ) : null}
      </div>

      {related.length > 0 ? (
        <section aria-label={t.relatedWork} className="case__related">
          <h2 className="type-heading">{t.relatedWork}</h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3" role="list">
            {await Promise.all(
              related.map(async (item) => (
                <li key={item.id}>
                  <Link className="link-inline type-ui" href={await localizedPostHref(item, ctx)}>
                    {item.title}
                  </Link>
                </li>
              )),
            )}
          </ul>
        </section>
      ) : null}

      {contactForm ? (
        <section aria-label={t.contact} className="case__inquiry">
          <h2 className="type-heading">{t.inquiry}</h2>
          <div className="mt-6 max-w-[40rem]">
            <CmsForm form={contactForm} locale={locale} />
          </div>
        </section>
      ) : null}
    </>
  )

  const kicker = (
    <>
      {sequence.index >= 0 ? <span>{positionLabel(sequence.index, sequence.total)}</span> : null}
      {cs.year ? <span>{cs.year}</span> : null}
      {categoryLabel(post) ? <span dir="auto">{categoryLabel(post)}</span> : null}
    </>
  )

  if (variant === 'overlay') {
    return (
      <CaseStudyPanel
        closeLabel={t.close}
        dir={ctx.dir}
        kicker={kicker}
        labels={shareLabels}
        marqueeEnabled={settings.caseStudyMarquee}
        next={
          nextPost
            ? {
                href: await localizedPostHref(nextPost, ctx),
                label: t.nextProject,
                title: toMosaicFields(nextPost).title,
              }
            : null
        }
        revealEnabled={settings.caseStudyReveal}
        shareUrl={shareUrl}
        title={cs.title}
        workKey={`${section}:${post.id}`}
      >
        {stage}
      </CaseStudyPanel>
    )
  }

  const content = (
    <ContentContainer className="case case--document py-10">
      <div className="case__panel">
        <div className="case__scroller">
          <div className="case__controls">
            <div className="case__control-bar">
              <ShareButton labels={shareLabels} title={cs.title} url={shareUrl} />
              <Link className="case__control" href={closeHref}>
                <span aria-hidden="true" className="case__control-glyph">
                  ←
                </span>
                {t.projects}
              </Link>
            </div>
          </div>
          <header className="case__title">
            {facts.length || sequence.index >= 0 ? <div className="case__kicker">{kicker}</div> : null}
            <h1 className="case__title-text" dir="auto">
              {cs.title}
            </h1>
          </header>
          <div className="case__stage">
            {stage}
            {nextPost ? (
              <Link className="case__next" href={await localizedPostHref(nextPost, ctx)}>
                <span className="case__next-label">{t.nextProject}</span>
                <span dir="auto">{toMosaicFields(nextPost).title}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </ContentContainer>
  )

  return (
    <InteriorPage
      context={ctx}
      crumbs={crumbs}
      currentPath={path}
      label={t.breadcrumb}
      switchDoc={{ id: post.id, kind: 'post', pathFor: (s) => detailPath(section, s) }}
    >
      {content}
      <div className="shell py-8">
        <a className="link-inline type-ui" href={href(THEME_ROUTES.contact, locale, ctx.site)}>
          {t.startConversation}
        </a>
      </div>
    </InteriorPage>
  )
}
