/* ===========================================================================
   Motion — the timing scale of the theme
   ---------------------------------------------------------------------------
   Every animated gesture in the theme goes through this module so the whole
   interface shares one rhythm. The reveal is deliberately unhurried: the title
   needs to travel a long way and land softly, the content follows it, and the
   marquee only starts once the entrance has settled.
   =========================================================================== */

/** Durations in milliseconds. Mirrors the CSS custom properties in tokens.css. */
export const DURATION = {
  backdrop: 420,
  title: 1000,
  stage: 1150,
  exit: 520,
  // A pause after the stage has settled, not a delay from the first frame.
  marqueeDelay: 240,
  marqueeRamp: 1200,
};

/** Easing curves. `outExpo` decelerates hard and lands without a bounce. */
export const EASE = {
  outExpo: 'cubic-bezier(0.16, 0.84, 0.28, 1)',
  inOutSoft: 'cubic-bezier(0.65, 0, 0.35, 1)',
  outSoft: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
};

/** How far the title travels when it comes in from above. */
export const TITLE_OFFSET = -140;

/** How far the content rises from below. */
export const STAGE_OFFSET = 76;

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Run a keyframe animation. `fill: 'none'` is deliberate: when the animation
 * ends the element falls back to its stylesheet state, which is exactly the
 * resting state of the reveal. Nothing has to be cleaned up by hand and the
 * frame after the animation is identical to its last frame.
 */
export function animate(element, keyframes, options = {}) {
  if (!element) return null;
  const animation = element.animate(keyframes, {
    easing: EASE.outExpo,
    fill: 'none',
    ...options,
  });
  return animation;
}

/** Promise that resolves after `ms`. */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve when the webfont that carries the display type is ready.
 * A timeout guards against a font server that never answers — the reveal
 * must not be held hostage by a missing file.
 */
export function fontsReady(timeout = 1500) {
  const ready = document.fonts?.ready ?? Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    Promise.resolve(ready).then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

/** Two animation frames — enough for the browser to have laid the element out. */
export function nextFrames(count = 2) {
  return new Promise((resolve) => {
    let left = count;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** Read the live transform of an element as a matrix string. */
export function currentTransform(element) {
  const value = getComputedStyle(element).transform;
  if (!value || value === 'none') return 'none';
  return value;
}

/** Read the live opacity of an element. */
export function currentOpacity(element) {
  const value = Number.parseFloat(getComputedStyle(element).opacity);
  return Number.isFinite(value) ? value : 1;
}
