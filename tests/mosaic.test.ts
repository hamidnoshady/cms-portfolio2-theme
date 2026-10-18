import { describe, expect, it } from 'vitest'

import { toMosaicFields } from '@/domain/portfolio'
import { planMosaic, planSpans, rowsAreFull, asSpan, MOSAIC_SPANS } from '@/lib/portfolio/mosaicPlan'
import type { PostDoc } from '@/lib/cms/types'

/**
 * The mosaic is a *promise* the theme makes to the CMS: whatever `posts` the archive
 * returns, the grid they are drawn on tiles a 12-column plane without holes. These
 * tests pin the composition rule itself — the part a stylesheet cannot see.
 */

describe('planSpans', () => {
  it('tiles every complete row with exactly 12 columns, for every plan and size', () => {
    for (const plan of ['duo', 'editorial', 'uniform'] as const) {
      for (const count of [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 17, 20, 24, 31]) {
        const spans = planSpans(count, plan)
        expect(spans).toHaveLength(count)
        expect(rowsAreFull(spans), `${plan} @ ${count}: rows must sum to 12`).toBe(true)
        for (const span of spans) expect(MOSAIC_SPANS).toContain(span)
      }
    }
  })

  it('never leaves a single tile stranded in a two-up row', () => {
    // The editorial pattern opens with [8,4]; a lone tail must take the whole line
    // instead of an 8-column stub next to a hole.
    expect(planSpans(3)[2]).toBe(12)
    expect(planSpans(1)[0]).toBe(12)
  })

  it('is deterministic: the same count always composes the same page', () => {
    expect(planSpans(9)).toEqual(planSpans(9))
    expect(planSpans(9, 'duo')).toEqual(planSpans(9, 'duo'))
  })

  it('opens the plans differently, so the operator’s choice actually composes differently', () => {
    expect(planSpans(3, 'duo')).not.toEqual(planSpans(3, 'uniform'))
    expect(planSpans(2, 'editorial')).toEqual([8, 4])
    expect(planSpans(2, 'duo')).toEqual([12, 12])
    expect(planSpans(4, 'uniform')).toEqual([6, 6, 6, 6])
  })
})

describe('planMosaic', () => {
  const doc = (id: string): { id: string } => ({ id })

  it('pins the bound lead work to the first position when it is present', () => {
    const items = ['a', 'b', 'c', 'd'].map(doc)
    const planned = planMosaic(items, { idOf: (item) => item.id, leadId: 'c', plan: 'editorial' })
    expect(planned[0]!.item.id).toBe('c')
    expect(planned).toHaveLength(4)
    expect(rowsAreFull(planned.map((entry) => entry.span))).toBe(true)
  })

  it('ignores a lead that is not in the list (draft, unpublished, wrong locale)', () => {
    const items = ['a', 'b'].map(doc)
    const planned = planMosaic(items, { idOf: (item) => item.id, leadId: 'ghost' })
    expect(planned.map((entry) => entry.item.id)).toEqual(['a', 'b'])
  })

  it('keeps a null lead honest: the archive order is the composition order', () => {
    const items = ['a', 'b', 'c'].map(doc)
    const planned = planMosaic(items, { idOf: (item) => item.id, leadId: null })
    expect(planned.map((entry) => entry.item.id)).toEqual(['a', 'b', 'c'])
  })

  it('accepting only legal spans is a property of the whole module', () => {
    expect(asSpan(4)).toBe(4)
    expect(asSpan('8')).toBe(8)
    expect(asSpan(5)).toBe(6)
    expect(asSpan(Number.NaN)).toBe(6)
    expect(asSpan(undefined)).toBe(6)
  })
})

describe('mosaic projection (toMosaicFields)', () => {
  const post = (over: Partial<PostDoc>): PostDoc =>
    ({ id: 'p-1', meta: {}, slug: 'x', title: 'A work', ...over }) as unknown as PostDoc

  it('maps only what the CMS returned, and every optional line degrades to null', () => {
    const fields = toMosaicFields(post({ projectMetadata: null }))
    expect(fields).toMatchObject({ id: 'p-1', kicker: null, role: null, summary: null, title: 'A work', year: null })
    expect(fields.media).toBeNull()
  })

  it('prefers the category label,then the stored status, then nothing', () => {
    const postWithMeta = post({ projectMetadata: { status: 'Built', date: '2025-02-10' } as never })
    expect(toMosaicFields(postWithMeta, { categoryLabel: 'Residential' }).kicker).toBe('Residential')
    expect(toMosaicFields(postWithMeta).kicker).toBe('Built')
    expect(toMosaicFields(postWithMeta).year).toBe('2025')
  })

  it('finds a Role fact rather than inventing one', () => {
    const withRole = post({
      projectMetadata: { additionalFacts: [{ label: 'Role', value: 'Identity, Art direction' }] } as never,
    })
    expect(toMosaicFields(withRole).role).toBe('Identity, Art direction')
  })

  it('never invents a summary from the narrative', () => {
    expect(toMosaicFields(post({ meta: { description: '   ' } })).summary).toBeNull()
  })
})
