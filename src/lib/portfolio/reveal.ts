/**
 * The reveal — timing scale and decisions, kept away from the DOM so they can be tested.
 *
 * `src/components/case/CaseStudyPanel.tsx` reads these numbers and plays them with the
 * Web Animations API; nothing else in the theme may hard-code a duration, so the whole
 * interface shares one rhythm (the same values exist as CSS custom properties in
 * `src/styles/tokens.css` — `tests/motion.test.ts` asserts the two lists agree).
 *
 * The gesture this file exists for: the title arrives from above, the content rises from
 * below, both land on one easing curve, and the horizontal drift of a long title starts
 * only *after* the stage has settled — a fixed delay from the click would overlap the
 * entrance on a slow device.
 */

export const EASE = {
  inOutSoft: 'cubic-bezier(0.65, 0, 0.35, 1)',
  outExpo: 'cubic-bezier(0.16, 0.84, 0.28, 1)',
  outSoft: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
} as const

export const REVEAL = {
  /** The quiet pause *after* the stage settles, not a delay from the first frame. */
  marqueeDelay: 240,
  /** The drift eases into its speed over this window rather than snapping to it. */
  marqueeRamp: 1200,
  /** Default drift, in CSS pixels per second; overridden by the theme setting. */
  marqueeSpeed: 44,
  backdrop: 420,
  title: 1000,
  titleDelay: 70,
  stage: 1150,
  stageDelay: 130,
  exit: 520,
} as const

/** How far the title travels in, and how far the stage rises. */
export const OFFSET = {
  enterStage: 76,
  enterTitle: -140,
  exitStage: 44,
  exitTitle: -26,
} as const

/** Fonts get this long before the reveal proceeds without them. */
export const FONTS_TIMEOUT_MS = 1500

/** A title may overflow its viewport by this much and still be considered fitting. */
export const MARQUEE_TOLERANCE_PX = 1

export const MARQUEE_SPEED_BOUNDS = { max: 120, min: 8 } as const

export type RevealPlan = {
  /** Play the entrance at all. False ⇒ the final frame is painted immediately. */
  animate: boolean;
  /** Start the horizontal drift once the stage settles. */
  marquee: boolean;
  marqueeDelay: number
  marqueeRamp: number
  marqueeSpeed: number
}

/**
 * Decide what to play. Two independent switches matter: the operator's settings and the
 * reader's `prefers-reduced-motion`. Reduced motion always wins — and it wins by
 * *omitting* the animation, not by shortening it, so no element is left mid-transform.
 */
export const planReveal = (options: {
  marqueeEnabled?: boolean
  reducedMotion: boolean
  revealEnabled?: boolean
  speed?: number
}): RevealPlan => {
  const animate = options.revealEnabled !== false && !options.reducedMotion
  const speed = Number.isFinite(options.speed)
    ? Math.min(MARQUEE_SPEED_BOUNDS.max, Math.max(MARQUEE_SPEED_BOUNDS.min, Number(options.speed)))
    : REVEAL.marqueeSpeed
  return {
    animate,
    marquee: animate && options.marqueeEnabled !== false,
    marqueeDelay: REVEAL.marqueeDelay,
    marqueeRamp: REVEAL.marqueeRamp,
    marqueeSpeed: speed,
  }
}

/**
 * Does the title need to move?
 *
 * A title that fits stays perfectly still — the marquee is a remedy for long titles, not
 * a default ornament. `copyWidth` is one copy of the title, `available` the viewport it
 * sits in; the second copy is only ever added when this returns true.
 */
export const marqueeNeedsDrift = (copyWidth: number, available: number): boolean =>
  Number.isFinite(copyWidth) &&
  Number.isFinite(available) &&
  copyWidth > available + MARQUEE_TOLERANCE_PX

/** Keyframes for the entrance, as WAAPI input (the DOM module owns nothing else). */
export const entranceKeyframes = () => ({
  backdrop: [{ opacity: 0 }, { opacity: 1 }],
  stage: [
    { transform: `translate3d(0, ${OFFSET.enterStage}px, 0)`, opacity: 0 },
    { transform: 'translate3d(0, 0, 0)', opacity: 1 },
  ],
  title: [
    { transform: `translate3d(0, ${OFFSET.enterTitle}px, 0)`, opacity: 0 },
    { transform: 'translate3d(0, 0, 0)', opacity: 1 },
  ],
})

/** Keyframes for the exit, from wherever the element currently is. */
export const exitKeyframes = (from: {
  stageOpacity: number
  stageTransform: string
  titleOpacity: number
  titleTransform: string
}) => ({
  backdrop: [{ opacity: 1 }, { opacity: 0 }],
  stage: [
    { transform: from.stageTransform, opacity: from.stageOpacity },
    { transform: `translate3d(0, ${OFFSET.exitStage}px, 0)`, opacity: 0 },
  ],
  title: [
    { transform: from.titleTransform, opacity: from.titleOpacity },
    { transform: `translate3d(0, ${OFFSET.exitTitle}px, 0)`, opacity: 0 },
  ],
})

/** `01 / 09` — Latin digits for the theme's own numerals; CMS dates go through the runtime helpers. */
export const positionLabel = (index: number, total: number): string =>
  `${String(index + 1).padStart(2, '0')} / ${String(Math.max(0, total)).padStart(2, '0')}`
