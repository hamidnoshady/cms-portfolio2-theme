/* ===========================================================================
   Marquee — the horizontal title drift
   ---------------------------------------------------------------------------
   The marquee owns exactly one element: the track. The entrance animation
   never touches it, so the two gestures can never fight over the same
   transform. It starts only after the reveal has settled, and it eases into
   its speed rather than snapping to it.
   =========================================================================== */

import { prefersReducedMotion } from './motion.js';

export class Marquee {
  constructor({ viewport, track, textClass = 'project__title-text' }) {
    this.viewport = viewport;
    this.track = track;
    this.textClass = textClass;
    this.copyWidth = 0;
    this.overflows = false;
    this.state = { running: false, raf: 0, x: 0, startAt: 0, last: 0, paused: false };

    this.onPointerEnter = () => {
      this.state.paused = true;
    };
    this.onPointerLeave = () => {
      this.state.paused = false;
    };
    this.viewport.addEventListener('pointerenter', this.onPointerEnter);
    this.viewport.addEventListener('pointerleave', this.onPointerLeave);
  }

  /** Replace the marquee content with the title. */
  setText(text) {
    const first = document.createElement('span');
    first.className = this.textClass;
    first.textContent = text;

    this.track.replaceChildren(first);
    this.first = first;
  }

  /** The loop needs a second copy of the title to roll into. */
  ensureSecondCopy() {
    if (!this.first || this.track.children.length > 1) return;
    const second = this.first.cloneNode(true);
    second.setAttribute('aria-hidden', 'true');
    this.track.append(second);
  }

  /** A title that fits gets exactly one copy — nothing is clipped. */
  removeSecondCopy() {
    while (this.track.children.length > 1) this.track.lastElementChild.remove();
  }

  /**
   * Measure the copy and decide whether the title has to move at all.
   * A title that fits stays perfectly still — the marquee is a solution for
   * long titles, not a default.
   */
  measure() {
    const first = this.track.firstElementChild;
    if (!first) {
      this.overflows = false;
      this.copyWidth = 0;
      return { overflows: false, copyWidth: 0 };
    }

    const styles = getComputedStyle(this.track);
    const gap = Number.parseFloat(styles.columnGap) || 0;
    const copyWidth = first.getBoundingClientRect().width;
    const available = this.viewport.getBoundingClientRect().width;

    this.overflows = copyWidth > available + 1;

    if (this.overflows) {
      this.ensureSecondCopy();
      this.copyWidth = copyWidth + gap;
    } else {
      this.removeSecondCopy();
      this.copyWidth = 0;
      this.reset();
    }

    return { overflows: this.overflows, copyWidth };
  }

  /**
   * Begin the drift. `delay` keeps the title still while the entrance plays;
   * `ramp` eases the speed up so the motion starts gently.
   */
  start({ delay = 0, ramp = 700, speed = 44 } = {}) {
    this.stop();
    if (!this.overflows) return false;
    if (prefersReducedMotion()) return false;

    this.state = {
      running: true,
      raf: 0,
      x: 0,
      startAt: performance.now() + delay,
      last: performance.now(),
      paused: false,
      ramp,
      speed,
    };

    const tick = (now) => {
      if (!this.state.running) return;
      const dt = Math.min(64, now - this.state.last) / 1000;
      this.state.last = now;

      const elapsed = now - this.state.startAt;
      if (elapsed >= 0 && !this.state.paused) {
        let velocity = this.state.speed;
        if (elapsed < this.state.ramp) {
          const u = elapsed / this.state.ramp;
          velocity = this.state.speed * (1 - (1 - u) ** 3);
        }
        this.state.x += velocity * dt;
        if (this.copyWidth > 0) this.state.x %= this.copyWidth;
        this.track.style.transform = `translate3d(${-this.state.x}px, 0, 0)`;
      }

      this.state.raf = requestAnimationFrame(tick);
    };

    this.state.raf = requestAnimationFrame(tick);
    return true;
  }

  /** Stop the drift and hand the transform back. */
  stop() {
    this.state.running = false;
    if (this.state.raf) cancelAnimationFrame(this.state.raf);
    this.state.raf = 0;
  }

  /** Remove the inline transform entirely. */
  reset() {
    this.stop();
    this.state.x = 0;
    this.track.style.transform = '';
  }
}
