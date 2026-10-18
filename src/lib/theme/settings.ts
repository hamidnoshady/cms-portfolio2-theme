import type { SiteDescriptor } from '@/lib/cms/types'

/**
 * Runtime settings, resolved from `GET /api/site` → `themeRuntime.settings`.
 *
 * Every value is coerced, never trusted: the platform stores what a customer typed into
 * a generated form, so a `mosaicPlan` of `"everything"` or a `homeTiles` of `10^9` has to
 * land on a legal value rather than reach a query or a CSS custom property. The bounds
 * here mirror the `settings` block of `eshobe.theme.json` — that manifest is the
 * declaration, this file is the enforcement, and `tests/manifest.test.ts` keeps the two
 * from drifting apart.
 */

export type MosaicPlan = 'duo' | 'editorial' | 'uniform'

export const MOSAIC_PLANS: readonly MosaicPlan[] = ['duo', 'editorial', 'uniform']

export type ResolvedThemeSettings = {
  /** Tiles rendered on the home mosaic; the archive paginates independently. */
  homeTiles: number
  /** How the 12-column rows are composed. */
  mosaicPlan: MosaicPlan
  /** Tiles per archive page (bounded: it becomes a CMS `limit`). */
  archiveTiles: number
  /** The coordinated title-from-above / content-from-below entrance. */
  caseStudyReveal: boolean
  /** Long-title horizontal drift inside the case study. */
  caseStudyMarquee: boolean
  /** Drift speed in pixels per second. */
  caseStudyMarqueeSpeed: number
}

export const SETTINGS_DEFAULTS: ResolvedThemeSettings = {
  archiveTiles: 18,
  caseStudyMarquee: true,
  caseStudyMarqueeSpeed: 44,
  caseStudyReveal: true,
  homeTiles: 6,
  mosaicPlan: 'editorial',
}

export const SETTINGS_BOUNDS = {
  archiveTiles: { max: 48, min: 6 },
  caseStudyMarqueeSpeed: { max: 120, min: 8 },
  homeTiles: { max: 24, min: 2 },
} as const

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

/** Rounded, clamped, NaN-proof: a text field can arrive as `"9"` or as `""`. */
const asBoundedNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

const asPlan = (value: unknown): MosaicPlan =>
  (MOSAIC_PLANS as readonly string[]).includes(String(value)) ? (value as MosaicPlan) : SETTINGS_DEFAULTS.mosaicPlan

export const resolveThemeSettings = (
  site: null | Pick<SiteDescriptor, 'themeRuntime'>,
): ResolvedThemeSettings => {
  const raw = (site?.themeRuntime?.settings ?? {}) as Record<string, unknown>
  return {
    archiveTiles: asBoundedNumber(raw.archiveTiles, SETTINGS_DEFAULTS.archiveTiles, SETTINGS_BOUNDS.archiveTiles.min, SETTINGS_BOUNDS.archiveTiles.max),
    caseStudyMarquee: asBoolean(raw.caseStudyMarquee, SETTINGS_DEFAULTS.caseStudyMarquee),
    caseStudyMarqueeSpeed: asBoundedNumber(
      raw.caseStudyMarqueeSpeed,
      SETTINGS_DEFAULTS.caseStudyMarqueeSpeed,
      SETTINGS_BOUNDS.caseStudyMarqueeSpeed.min,
      SETTINGS_BOUNDS.caseStudyMarqueeSpeed.max,
    ),
    caseStudyReveal: asBoolean(raw.caseStudyReveal, SETTINGS_DEFAULTS.caseStudyReveal),
    homeTiles: asBoundedNumber(raw.homeTiles, SETTINGS_DEFAULTS.homeTiles, SETTINGS_BOUNDS.homeTiles.min, SETTINGS_BOUNDS.homeTiles.max),
    mosaicPlan: asPlan(raw.mosaicPlan),
  }
}
