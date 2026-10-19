import { MARQUEE_TOLERANCE_PX } from '@/lib/portfolio/reveal'

/**
 * The horizontal title drift.
 *
 * It owns exactly one element: the track. The entrance never touches the track, so the
 * two gestures cannot fight over the same transform. Two behaviours are load-bearing:
 *
 * - A title that fits is **never** moved, and no second copy is inserted. The marquee is
 *   a remedy for overflow, not an ornament; `overflows` is measured after the fonts
 *   resolve, because the same title is ~15 % wider in the fallback face.
 * - The speed ramps in. Starting at full velocity reads as a slip of the page; the first
 *   `ramp` milliseconds ease from zero to `speed` on a cubic curve.
 *
 * Direction: in RTL the second copy sits to the *left*, so the offset grows positive
 * instead of negative. Everything else is identical, which is why this file takes `dir`
 * as an argument rather than reading a stylesheet.
 */

export type MarqueeOptions = { dir?: 'ltr' | 'rtl' }

export type MarqueeMeasurement = { copyWidth: number; overflows: boolean }

const TITLE_CLASS = 'case__title-text'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export class Marquee {
  private copyWidth = 0
  private first: HTMLElement | null = null
  private overflows = false
  private paused = false
  private raf = 0
  private ramp = 0
  private running = false
  private speed = 44
  private startAt = 0
  private last = 0
  private x = 0
  private readonly direction: 'ltr' | 'rtl'

  constructor(
    private readonly viewport: HTMLElement,
    private readonly track: HTMLElement,
    options: MarqueeOptions = {},
  ) {
    this.direction = options.dir === 'rtl' ? 'rtl' : 'ltr'
  }

  /** The reader reaching for the title stops the drift; it must stay readable. */
  private readonly onPointerEnter = (): void => {
    this.paused = true
  }

  private readonly onPointerLeave = (): void => {
    this.paused = false
  }

  addListeners(): void {
    this.viewport.addEventListener('pointerenter', this.onPointerEnter)
    this.viewport.addEventListener('pointerleave', this.onPointerLeave)
  }

  destroy(): void {
    this.stop()
    this.viewport.removeEventListener('pointerenter', this.onPointerEnter)
    this.viewport.removeEventListener('pointerleave', this.onPointerLeave)
  }

  /** Replace the track's content with one copy of the title. */
  setText(text: string): void {
    const first = document.createElement('span')
    first.className = TITLE_CLASS
    first.textContent = text
    this.track.replaceChildren(first)
    this.first = first
  }

  get doesOverflow(): boolean {
    return this.overflows
  }

  private ensureSecondCopy(gap: number): void {
    if (!this.first || this.track.children.length > 1) return
    const second = this.first.cloneNode(true) as HTMLElement
    second.setAttribute('aria-hidden', 'true')
    this.track.append(second)
    this.copyWidth = this.first.getBoundingClientRect().width + gap
  }

  private removeSecondCopy(): void {
    while (this.track.children.length > 1) this.track.lastElementChild?.remove()
  }

  /**
   * Measure the copy and decide whether the title has to move at all. The decision is
   * returned so the caller can publish it as `data-marquee`: the CSS needs it to let a
   * fitting title wrap like normal text instead of sitting on a nowrap track.
   */
  measure(): MarqueeMeasurement {
    const first = this.track.firstElementChild as HTMLElement | null
    if (!first) {
      this.overflows = false
      this.copyWidth = 0
      return { copyWidth: 0, overflows: false }
    }

    const gap = Number.parseFloat(getComputedStyle(this.track).columnGap) || 0
    const copyWidth = first.getBoundingClientRect().width
    const available = this.viewport.getBoundingClientRect().width
    this.overflows = copyWidth > available + MARQUEE_TOLERANCE_PX

    if (this.overflows) {
      this.ensureSecondCopy(gap)
    } else {
      this.removeSecondCopy()
      this.copyWidth = 0
      this.reset()
    }

    return { copyWidth, overflows: this.overflows }
  }

  /**
   * Begin the drift. `delay` keeps the title still while the entrance plays; the caller
   * starts it when the *stage settles*, never on a fixed timer from the click.
   * Returns whether anything started, so a caller can report a no-op honestly.
   */
  start(options: { delay?: number; ramp?: number; speed?: number } = {}): boolean {
    this.stop()
    if (!this.overflows) return false
    if (window.matchMedia?.(REDUCED_MOTION).matches) return false

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.ramp = options.ramp ?? 700
    this.speed = options.speed ?? 44
    this.running = true
    this.paused = false
    this.x = 0
    this.last = now
    this.startAt = now + (options.delay ?? 0)

    const tick = (time: number): void => {
      if (!this.running) return
      const delta = Math.min(64, time - this.last) / 1000
      this.last = time
      const elapsed = time - this.startAt

      if (elapsed >= 0 && !this.paused) {
        let velocity = this.speed
        if (elapsed < this.ramp) {
          const progress = elapsed / this.ramp
          velocity = this.speed * (1 - (1 - progress) ** 3)
        }
        this.x += velocity * delta
        if (this.copyWidth > 0) this.x %= this.copyWidth
        const offset = this.direction === 'rtl' ? this.x : -this.x
        this.track.style.transform = `translate3d(${offset}px, 0, 0)`
      }

      this.raf = requestAnimationFrame(tick)
    }

    this.raf = requestAnimationFrame(tick)
    return true
  }

  stop(): void {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  /** Stop and hand the inline transform back to the stylesheet. */
  reset(): void {
    this.stop()
    this.x = 0
    this.track.style.transform = ''
  }
}
