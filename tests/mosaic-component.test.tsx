// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Mosaic, type MosaicWork } from '@/components/mosaic/Mosaic'

/**
 * The tile contract: every work is a *link* (not a button with a click handler — it has
 * to work without JavaScript, and be openable in a new tab), the image is decorative
 * (the anchor's aria-labelnames the tile), and the first row is eager while the rest
 * is lazy, because the first row is the largest paint.
 */

const makeWork = (over: Partial<MosaicWork> = {}): MosaicWork => ({
  href: '/projects/sable',
  id: 'p-1',
  kicker: 'Hospitality identity',
  media: null,
  position: 0,
  role: 'Identity, Art direction',
  span: 8,
  summary: null,
  title: 'Sable & Salt',
  year: '2025',
  ...over,
})

const labels = { openWork: (title: string) => `Open ${title}`, region: 'Selected work' }

describe('Mosaic', () => {
  it('renders one link per work, each labelled by its title', () => {
    const works = [makeWork(), makeWork({ href: '/projects/vesper', id: 'p-2', position: 1, span: 4, title: 'Vesper' })]
    const { container } = render(<Mosaic items={works} labels={labels} origin="https://media.test" total={9} />)

    const tiles = container.querySelectorAll<HTMLAnchorElement>('.mosaic__tile')
    expect(tiles).toHaveLength(2)
    expect(tiles[0]!.getAttribute('href')).toBe('/projects/sable')
    expect(tiles[0]!.getAttribute('aria-label')).toBe('Open Sable & Salt')
    expect(tiles[1]!.getAttribute('href')).toBe('/projects/vesper')
  })

  it('carries the planned span as data and as the grid style, and the numeral of the archive', () => {
    const { container } = render(<Mosaic items={[makeWork({ span: 8 })]} labels={labels} origin="" total={9} />)
    const tile = container.querySelector('.mosaic__tile')!
    expect(tile.getAttribute('data-span')).toBe('8')
    expect((tile as HTMLElement).style.gridColumn).toBe('span 8 / span 8')
    expect(container.querySelector('.mosaic__index')?.textContent).toBe('01 / 09')
    expect(container.querySelector('.mosaic')?.getAttribute('aria-label')).toBe('Selected work')
  })

  it('draws the artwork as decorative, eager on the first tiles, lazy below the fold', () => {
    const media = { alt: 'Studio photo', height: 1000, id: 'm1', url: '/api/media/file/p.jpg', width: 800 }
    const works = [
      makeWork({ id: 'a', position: 0 }),
      makeWork({ href: '/b', id: 'b', position: 1, title: 'B' }),
      makeWork({ href: '/c', id: 'c', position: 2, title: 'C' }),
      makeWork({ href: '/d', id: 'd', position: 3, title: 'D' }),
    ]
    const { container } = render(
      <Mosaic items={works.map((work) => ({ ...work, media }))} labels={labels} origin="https://media.test" total={4} />,
    )
    const images = [...container.querySelectorAll('img')]
    expect(images).toHaveLength(4)
    expect(images[0]!.getAttribute('loading')).toBe('eager')
    expect(images[1]!.getAttribute('loading')).toBe('eager')
    expect(images[2]!.getAttribute('loading')).toBe('lazy')
    expect(images[3]!.getAttribute('loading')).toBe('lazy')
    for (const image of images) {
      expect(image.getAttribute('alt')).toBe('')
      // The URL stays on the *deployment's* own origin — `/api/media/file/*` proxies to
      // the CMS (`proxiesApi: true`), so a preview hostname shows real photography and
      // nothing ever points a visitor at the control plane. The origin allowlist is
      // what refuses a foreign URL, which the next test pins down.
      expect(image.getAttribute('src')).toBe('/api/media/file/p.jpg')
      expect(image.closest('.mosaic__art')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('renders no image and no fabricated subtitle for a work without returned data', () => {
    const bare = makeWork({ kicker: null, role: null, summary: null, year: null })
    const { container } = render(<Mosaic items={[bare]} labels={labels} origin="https://media.test" total={1} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.mosaic__summary')).toBeNull()
  })

  it('refuses a media URL from an origin the site did not publish', () => {
    const foreign = { alt: 'x', height: 10, id: 'm2', url: 'https://evil.example/x.jpg', width: 10 }
    const { container } = render(
      <Mosaic items={[makeWork({ media: foreign })]} labels={labels} origin="https://media.test" total={1} />,
    )
    expect(container.querySelector('img')).toBeNull()
  })
})
