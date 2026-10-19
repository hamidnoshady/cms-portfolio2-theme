'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { ShareButton, type ShareLabels } from '@/components/portfolio/ShareButton'
import { Marquee } from './marquee'
import { EASE, FONTS_TIMEOUT_MS, REVEAL, entranceKeyframes, exitKeyframes, planReveal } from '@/lib/portfolio/reveal'

/**
 * The case-study reveal (`CaseStudyPanel`).
 *
 * Rendered by the intercepted `@overlay` slot, so the mosaic behind it is the *same*
 * page instance: opening a work adds a panel, closing hands the page back with its scroll
 * position and focus untouched. No JS, or a direct URL, renders the same content as a
 * document (`CaseStudyView`, `variant="document"`) — this component is an enhancement,
 * never a requirement.
 *
 * The sequence, which is the entire point of the file:
 *
 *   armed → fonts settle → title height + marquee measured → entrance plays
 *         → (stage settled) → drift starts
 *
 * `armed` paints the panel invisible, so a reader never sees a frame of un-animated
 * content. Measuring before animating is what stops the metadata from sliding under a
 * title that is still about to grow. The drift waits for the *stage*, not for a timer.
 *
 * Invariants kept from the prototype:
 * - the scroller is never transformed (sticky controls would break);
 * - the title lives in flow at the top of the scroller; only Share/Close stick;
 * - a project always opens at `scrollTop = 0`, and closing never scrolls it first;
 * - every temporary transform is handed back when it settles.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type CaseStudyPanelProps = {
  /** The case study itself: kicker, meta, narrative, media. */
  children: ReactNode
  closeLabel: string
  dir: 'ltr' | 'rtl'
  labels: ShareLabels
  next: { href: string; label: string; title: string } | null
  /** `caseStudyMarquee` — the operator's switch for the long-title drift. */
  marqueeEnabled: boolean
  /** `caseStudyReveal` — the operator's switch for the entrance itself. */
  revealEnabled: boolean
  shareUrl: string
  /** The title, as text: the drift needs the string, the markup needs the accessible name. */
  title: string
  /** The `01 / 09 · 2025 · Identity` line above the title, from the view. */
  kicker?: ReactNode
  /** Identity of the work on screen; a change re-runs the reveal (next/previous). */
  workKey: string
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/** Resolve when the display face is ready, bounded so a hanging font server cannot hold the reveal hostage. */
const fontsReady = (timeout = FONTS_TIMEOUT_MS): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout)
    const done = (): void => {
      clearTimeout(timer)
      resolve()
    }
    Promise.resolve(document.fonts?.ready ?? Promise.resolve()).then(done, done)
  })

const nextFrames = (count = 2): Promise<void> =>
  new Promise((resolve) => {
    let left = count
    const step = (): void => {
      left -= 1
      if (left <= 0) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })

const readTransform = (element: HTMLElement | null): string => {
  if (!element) return 'none'
  const value = getComputedStyle(element).transform
  return value && value !== 'none' ? value : 'none'
}

const readOpacity = (element: HTMLElement | null): number => {
  if (!element) return 1
  const value = Number.parseFloat(getComputedStyle(element).opacity)
  return Number.isFinite(value) ? value : 1
}

type Phase = 'armed' | 'open' | 'switching' | 'closing'

export const CaseStudyPanel = ({
  children,
  closeLabel,
  dir,
  kicker,
  labels,
  marqueeEnabled,
  next,
  revealEnabled,
  shareUrl,
  title,
  workKey,
}: CaseStudyPanelProps) => {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const marqueeViewportRef = useRef<HTMLDivElement | null>(null)
  const marqueeTrackRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const marqueeRef = useRef<Marquee | null>(null)
  const animationsRef = useRef<Animation[]>([])
  /* `phase` is a render value; this is its close-path mirror. State updates are async,
     so two fast Escape presses can otherwise run close() twice and pop two history
     entries — the close must be idempotent at hand-owning level, not at paint level. */
  const closingRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('armed')
  const [drift, setDrift] = useState(false)

  const plan = planReveal({
    marqueeEnabled,
    reducedMotion: prefersReducedMotion(),
    revealEnabled,
    speed: REVEAL.marqueeSpeed,
  })

  const cancelAnimations = useCallback((): void => {
    for (const animation of animationsRef.current) animation.cancel()
    animationsRef.current = []
  }, [])

  const measure = useCallback(async (): Promise<void> => {
    const root = rootRef.current
    const titleEl = titleRef.current
    const marquee = marqueeRef.current
    if (!root || !titleEl) return

    // Reserve the title's own height before the stage is placed under it, then verify
    // the two do not overlap — a warning, not a silent patch, is what makes a CSS
    // regression in either block visible in a console and in `docs/QA.md`.
    root.style.setProperty('--case-title-h', `${Math.round(titleEl.getBoundingClientRect().height)}px`)
    const measurement = marquee?.measure()
    await nextFrames(2)
    const titleRect = titleEl.getBoundingClientRect()
    const stageRect = stageRef.current?.getBoundingClientRect()
    if (stageRect && stageRect.top < titleRect.bottom - 0.5) {
      console.warn('[case-study] the stage overlaps the title', {
        stageTop: stageRect.top,
        titleBottom: titleRect.bottom,
      })
    }
    if (measurement) setDrift(measurement.overflows)
  }, [])

  const playEntrance = useCallback((): void => {
    const root = rootRef.current
    const titleEl = titleRef.current
    const stageEl = stageRef.current
    const backdropEl = backdropRef.current
    if (!root || !titleEl || !stageEl) return

    cancelAnimations()
    root.dataset.state = 'open'
    setPhase('open')
    // Focus the panel, not the close button: the reader's next Tab lands on the first
    // control of the case study rather than on "Close".
    panelRef.current?.focus({ preventScroll: true })

    if (!plan.animate) {
      marqueeRef.current?.reset()
      return
    }

    const keyframes = entranceKeyframes()
    const titleAnimation = titleEl.animate(keyframes.title, {
      delay: REVEAL.titleDelay,
      duration: REVEAL.title,
      easing: EASE.outExpo,
      fill: 'none',
    })
    const stageAnimation = stageEl.animate(keyframes.stage, {
      delay: REVEAL.stageDelay,
      duration: REVEAL.stage,
      easing: EASE.outExpo,
      fill: 'none',
    })
    const backdropAnimation = backdropEl?.animate(keyframes.backdrop, {
      duration: REVEAL.backdrop,
      easing: 'ease-out',
      fill: 'none',
    })
    animationsRef.current = [titleAnimation, stageAnimation, ...(backdropAnimation ? [backdropAnimation] : [])]

    const settle = (): void => {
      // `fill: 'none'` already returned the elements to their stylesheet state; the
      // classes exist so a stylesheet can style `:data(state)` without a JS hand-off.
      root.dataset.state = 'open'
    }
    Promise.all([titleAnimation.finished, stageAnimation.finished]).then(settle, settle)

    // The drift is a separate gesture: it starts when the content has actually landed.
    stageAnimation.finished.then(
      () => {
        if (root.dataset.state === 'closing') return
        marqueeRef.current?.start({
          delay: plan.marqueeDelay,
          ramp: plan.marqueeRamp,
          speed: plan.marqueeSpeed,
        })
      },
      () => undefined,
    )
  }, [cancelAnimations, plan.animate, plan.marqueeDelay, plan.marqueeRamp, plan.marqueeSpeed])

  /* --- mount + swap: measure, then reveal -------------------------------- */
  useEffect(() => {
    const viewport = marqueeViewportRef.current
    const track = marqueeTrackRef.current
    if (!viewport || !track) return

    const marquee = new Marquee(viewport, track, { dir })
    marqueeRef.current = marquee
    marquee.addListeners()
    // The track already holds the server-rendered title; the engine takes it over so a
    // no-JS reader and a bot see the same text the animation uses.
    marquee.setText('')
    marquee.setText(title)

    let cancelled = false
    const run = async (): Promise<void> => {
      await fontsReady()
      if (cancelled) return
      await measure()
      if (cancelled) return
      const scroller = scrollerRef.current
      // A reader who took over mid-measure keeps their position; nobody else.
      if (scroller && scroller.scrollTop === 0) scroller.scrollTop = 0
      playEntrance()
    }
    void run()

    return () => {
      cancelled = true
      marquee.destroy()
      marqueeRef.current = null
    }
    // `title`/`workKey` change when the case study swaps under the same panel (next
    // work); the entrance is per-work, so it re-runs deliberately.
  }, [dir, measure, playEntrance, title, workKey])

  /* --- background: freeze, trap focus, restore --------------------------- */
  useEffect(() => {
    const root = rootRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousTitle = document.title

    document.documentElement.dataset.caseOpen = 'true'
    document.body.dataset.caseOpen = 'true'
    if (typeof title === 'string' && title) document.title = title

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || !root) return
      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.tabIndex !== -1 && !element.hasAttribute('disabled'),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && (!active || active === first || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!active || active === last || !root.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      delete document.documentElement.dataset.caseOpen
      delete document.body.dataset.caseOpen
      document.title = previousTitle
      root?.style.removeProperty('--case-title-h')
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
      // A re-render for another work is a new panel; the close guard must not be sticky.
      closingRef.current = false
    }
  }, [title])

  const close = useCallback((): void => {
    if (closingRef.current) return
    closingRef.current = true
    const root = rootRef.current
    marqueeRef.current?.stop()

    if (!plan.animate || !root) {
      router.back()
      return
    }

    // Continue from wherever the entrance happens to be, so closing mid-reveal never
    // snaps, and leave the scroller where the reader left it: the reset happens after
    // the exit, on unmount, when nothing is visible any more.
    root.dataset.state = 'closing'
    setPhase('closing')
    cancelAnimations()
    const keyframes = exitKeyframes({
      stageOpacity: readOpacity(stageRef.current),
      stageTransform: readTransform(stageRef.current),
      titleOpacity: readOpacity(titleRef.current),
      titleTransform: readTransform(titleRef.current),
    })
    const exits = [
      titleRef.current?.animate(keyframes.title, { duration: REVEAL.exit, easing: EASE.inOutSoft, fill: 'none' }),
      stageRef.current?.animate(keyframes.stage, { duration: REVEAL.exit, easing: EASE.inOutSoft, fill: 'none' }),
      backdropRef.current?.animate(keyframes.backdrop, { duration: REVEAL.exit, easing: EASE.inOutSoft, fill: 'none' }),
      panelRef.current?.animate(
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0.94, transform: 'scale(0.988)' },
        ],
        { duration: REVEAL.exit, easing: EASE.inOutSoft, fill: 'none' },
      ),
    ].filter((animation): animation is Animation => Boolean(animation))
    animationsRef.current = exits
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      router.back()
    }
    Promise.all(exits.map((animation) => animation.finished.catch(() => undefined))).then(finish, finish)
    // A browser that never resolves `finished` (tab backgrounded) must not strand the
    // reader in a panel that will not close.
    setTimeout(finish, REVEAL.exit + 400)
  }, [cancelAnimations, plan.animate, router])

  /* --- Escape ------------------------------------------------------------ */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !event.defaultPrevented && phase !== 'closing') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, phase])

  return (
    <div
      aria-label={title}
      className="case"
      data-drift={drift ? 'true' : 'false'}
      data-marquee={drift ? 'true' : 'false'}
      data-state={phase}
      dir={dir}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
    >
      <div className="case__backdrop" data-backdrop ref={backdropRef} />
      <div className="case__panel" ref={panelRef} tabIndex={-1}>
        <div className="case__scroller" data-lenis-prevent data-scroller ref={scrollerRef}>
          <div className="case__controls">
            <div className="case__control-bar">
              <ShareButton labels={labels} title={title} url={shareUrl} />
              <button
                className="case__control"
                data-close
                onClick={close}
                ref={closeRef}
                type="button"
              >
                <span aria-hidden="true" className="case__control-glyph">
                  ✕
                </span>
                {closeLabel}
              </button>
            </div>
          </div>

          {/* The title is the first block of the scroller: in flow, so it scrolls away
              with the case study. The duplicate copy the drift rolls into is
              `aria-hidden`, added by the engine only when the title overflows. */}
          <header className="case__title" data-title ref={titleRef}>
            {kicker ? <div className="case__kicker">{kicker}</div> : null}
            <h1 className="sr-only" dir={dir}>
              {title}
            </h1>
            <div aria-hidden="true" className="case__marquee" data-marquee-viewport ref={marqueeViewportRef}>
              <div className="case__marquee-track" data-marquee-track ref={marqueeTrackRef}>
                <span className="case__title-text">{title}</span>
              </div>
            </div>
          </header>

          <div className="case__stage" data-stage ref={stageRef}>
            {children}
            {next ? (
              <Link className="case__next" data-next href={next.href}>
                <span className="case__next-label">{next.label}</span>
                <span dir={dir}>{next.title}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
