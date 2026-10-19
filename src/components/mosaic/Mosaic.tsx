import Link from 'next/link'

import type { Media } from '@/lib/cms/types'
import { type MosaicSpan } from '@/lib/portfolio/mosaicPlan'
import { mediaOriginAllowed, mediaUrl } from '@/lib/utils/media'
import { positionLabel } from '@/lib/portfolio/reveal'

/**
 * The mosaic — the index of work, and the theme's only archive.
 *
 * Server-rendered on purpose. Each tile is a real `<Link>` to `/projects/<slug>`, so:
 * the archive works with JavaScript absent; a middle-click or "open in new tab" works;
 * the crawler sees the case-study URLs; and the reveal is an *enhancement* that Next's
 * intercepting route applies on top (`src/app/@overlay`), not a client-side router.
 *
 * Media is drawn as a plain `<img>` here rather than through `CmsImage`: a tile is
 * already a link, and `CmsImage` wraps its frame in a lightbox trigger — nested
 * interactives inside an anchor are invalid, and the watermark is decorative. The origin
 * allowlist is still applied (`mediaOriginAllowed`), because a CMS `url` is stored data.
 */

export type MosaicWork = {
  href: string
  id: string
  /** The discipline/kicker line, from the work's own category or its status fact. */
  kicker: null | string
  media: null | Media
  /** Where in the published sequence this work sits (0-based). */
  position: number
  role: null | string
  span: MosaicSpan
  summary: null | string
  title: string
  year: null | string
}

export type MosaicLabels = {
  openWork: (title: string) => string
  region: string
}

export const Mosaic = ({
  items,
  labels,
  origin,
  total,
}: {
  items: readonly MosaicWork[]
  labels: MosaicLabels
  origin: string
  total: number
}) => (
  <ul aria-label={labels.region} className="mosaic" role="list">
    {items.map((work, index) => (
      <li className="contents" key={work.id}>
        <MosaicTile
          eager={index < 2}
          labels={labels}
          origin={origin}
          position={work.position}
          total={total}
          work={work}
        />
      </li>
    ))}
  </ul>
)

export const MosaicTile = ({
  eager = false,
  labels,
  origin,
  position,
  total,
  work,
}: {
  eager?: boolean
  labels: MosaicLabels
  origin: string
  /** Global index in the archive — the numeral a tile is labelled with. */
  position: number
  total: number
  work: MosaicWork
}) => {
  const src = mediaUrl(work.media, origin)
  const art = src && mediaOriginAllowed(src, [origin]) ? src : null

  return (
    <Link
      aria-label={labels.openWork(work.title)}
      className="mosaic__tile"
      data-span={String(work.span)}
      href={work.href}
      style={{ gridColumn: `span ${work.span} / span ${work.span}` }}
    >
      {art ? (
        <span aria-hidden="true" className="mosaic__art">
          {/* The first row is the page's largest paint, so it is eager; everything below
              the fold is lazy and `decoding=async` so a big photograph never blocks. */}
          <img alt="" decoding="async" loading={eager ? 'eager' : 'lazy'} src={art} />
        </span>
      ) : null}

      <span className="mosaic__top">
        <span className="mosaic__index">{positionLabel(position, total)}</span>
        {work.kicker ? <span>{work.kicker}</span> : null}
      </span>

      <span className="mosaic__title" dir="auto">
        {work.title}
      </span>

      {work.summary ? (
        <span className="mosaic__summary" dir="auto">
          {work.summary}
        </span>
      ) : null}

      <span className="mosaic__foot">
        {work.year ? <span>{work.year}</span> : null}
        {work.role ? <span dir="auto">{work.role}</span> : null}
      </span>
    </Link>
  )
}
