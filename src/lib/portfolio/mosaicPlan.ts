/**
 * Mosaic composition — pure, DOM-free, unit-tested.
 *
 * The prototype carried a hand-picked `span` per project. A CMS-managed theme cannot
 * ask an editor for one: the works come from `posts` in publication order, so the
 * *rhythm* is a rule the theme owns. Rows must tile a 12-column grid exactly — a
 * leftover 2-column hole in a row is what makes an "editorial" grid look broken rather
 * than composed, so the tail of a sequence is widened instead of truncated.
 */

export const MOSAIC_COLUMNS = 12

/** Spans this theme can draw. Anything else falls back to the half-row. */
export const MOSAIC_SPANS = [4, 6, 8, 12] as const
export type MosaicSpan = (typeof MOSAIC_SPANS)[number]

export type MosaicPlan = 'duo' | 'editorial' | 'uniform'

export type MosaicItem<T> = { item: T; span: MosaicSpan }

/**
 * Row patterns per plan. Each array is one row and each row sums to 12; the rows cycle,
 * so 9 works produce a composed page instead of nine identical bands.
 *
 * - `editorial` — a wide lead with a narrow partner, a matched pair, the inverse pair,
 *   then a full-bleed band.
 * - `duo` — a full-bleed lead, then two-up. The calm option, closest to a list.
 * - `uniform` — two-up throughout, for a customer who wants no hierarchy at all.
 */
const PATTERNS: Record<MosaicPlan, readonly (readonly MosaicSpan[])[]> = {
  duo: [[12], [6, 6]],
  editorial: [[8, 4], [6, 6], [4, 8], [12]],
  uniform: [[6, 6]],
}

const patternFor = (plan: MosaicPlan | undefined): readonly (readonly MosaicSpan[])[] =>
  PATTERNS[plan ?? 'editorial'] ?? PATTERNS.editorial

/** Equal share of a full row for the last `remaining` items (1→12, 2→6, 3→4). */
const tailSpan = (remaining: number): MosaicSpan => {
  const share = MOSAIC_COLUMNS / Math.max(1, remaining)
  const nearest = MOSAIC_SPANS.reduce((best, span) =>
    Math.abs(span - share) < Math.abs(best - share) ? span : best,
  )
  return nearest
}

/** The spans for `count` items, in order; every complete row sums to 12. */
export const planSpans = (count: number, plan: MosaicPlan = 'editorial'): MosaicSpan[] => {
  const total = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (total === 0) return []

  const rows = patternFor(plan)
  const out: MosaicSpan[] = []
  let remaining = total
  let rowIndex = 0

  while (remaining > 0) {
    const row = rows[rowIndex % rows.length] ?? rows[0]!
    rowIndex += 1
    if (remaining < row.length) {
      const span = tailSpan(remaining)
      for (let index = 0; index < remaining; index += 1) out.push(span)
      break
    }
    for (const span of row) {
      out.push(span)
      remaining -= 1
    }
  }

  return out
}

/** Every row of a span list sums to 12 — the invariant the CSS layout relies on. */
export const rowsAreFull = (spans: readonly MosaicSpan[]): boolean => {
  let row = 0
  for (const span of spans) {
    if (row + span > MOSAIC_COLUMNS) return false
    row += span
    if (row === MOSAIC_COLUMNS) row = 0
  }
  return row === 0
}

/**
 * Items with their spans. `leadId` — the document bound to the `leadWork` slot — is
 * pinned to the first position; a lead that is not in the list (draft, wrong locale,
 * unpublished) is ignored rather than rendered as an empty frame.
 */
export const planMosaic = <T>(
  items: readonly T[],
  options: { idOf: (item: T) => string; leadId?: null | string; plan?: MosaicPlan },
): MosaicItem<T>[] => {
  const { idOf, leadId, plan = 'editorial' } = options
  const lead = leadId ? items.find((item) => idOf(item) === leadId) : undefined
  const ordered = lead
    ? [lead, ...items.filter((item) => idOf(item) !== idOf(lead))]
    : [...items]
  const spans = planSpans(ordered.length, plan)
  return ordered.map((item, index) => ({ item, span: spans[index] ?? 6 }))
}

/** Legal span or the half-row: a CMS/customer value is never trusted to be one. */
export const asSpan = (value: unknown): MosaicSpan =>
  (MOSAIC_SPANS as readonly number[]).includes(Number(value)) ? (Number(value) as MosaicSpan) : 6

/** Two-up below the breakpoint: the CSS collapses every span, so the plan is desktop-only. */
export const MOSAIC_COLLAPSE_BELOW_PX = 900
