/* ===========================================================================
   Project view — opening and closing a case study
   ---------------------------------------------------------------------------
   The rules this file exists to enforce:

   · The title is the first block of the scroller. It is not fixed and not
     sticky, so it scrolls away with the case study. Only SHARE and CLOSE
     stick, and they stick inside the scroller.

   · The entrance is slow and coordinated. The title arrives from above, the
     content rises from below, both land on the same easing curve, and
     nothing snaps at the end of the gesture.

   · The entrance is animated on an outer wrapper (the stage), and the
     temporary transforms are handed back when it settles — the resting state
     of every animated element is identical to its last animated frame, so
     there is no jump.

   · A project always opens at scrollTop = 0, and the reveal only starts once
     the fonts are resolved and the layout has been measured.

   · Closing never scrolls the project. The exit animation continues from
     wherever the reader was, and the mosaic position is restored afterwards.
   =========================================================================== */

import {
  DURATION,
  EASE,
  STAGE_OFFSET,
  TITLE_OFFSET,
  animate,
  currentOpacity,
  currentTransform,
  fontsReady,
  nextFrames,
  prefersReducedMotion,
} from './motion.js';
import { Marquee } from './marquee.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class ProjectView {
  constructor({ root, projects = [], onOpen, onClose, onChange, getTileRect }) {
    this.root = root;
    this.projects = projects;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onChange = onChange;
    this.getTileRect = getTileRect;

    this.backdropEl = root.querySelector('[data-backdrop]');
    this.panelEl = root.querySelector('[data-panel]');
    this.scrollerEl = root.querySelector('[data-scroller]');
    this.controlsEl = root.querySelector('[data-controls]');
    this.shareToggleEl = root.querySelector('[data-share-toggle]');
    this.shareMenuEl = root.querySelector('[data-share-menu]');
    this.shareNoteEl = root.querySelector('[data-share-note]');
    this.closeEl = root.querySelector('[data-close]');
    this.titleEl = root.querySelector('[data-title]');
    this.titleA11yEl = root.querySelector('[data-title-a11y]');
    this.kickerEl = root.querySelector('[data-kicker]');
    this.marqueeViewportEl = root.querySelector('[data-marquee]');
    this.marqueeTrackEl = root.querySelector('[data-marquee-track]');
    this.stageEl = root.querySelector('[data-stage]');
    this.metaEl = root.querySelector('[data-meta]');
    this.introEl = root.querySelector('[data-intro]');
    this.bodyEl = root.querySelector('[data-body]');
    this.nextEl = root.querySelector('[data-next]');
    this.counterEl = root.querySelector('[data-counter]');

    this.marquee = new Marquee({
      viewport: this.marqueeViewportEl,
      track: this.marqueeTrackEl,
    });

    this.animations = [];
    this.state = {
      open: false,
      opening: false,
      closing: false,
      index: -1,
      token: 0,
      navToken: 0,
      savedScroll: 0,
      savedFocus: null,
      userScrolled: false,
    };

    this.bindEvents();
  }

  /* ------------------------------------------------------------------ *
   * events
   * ------------------------------------------------------------------ */

  bindEvents() {
    this.closeEl.addEventListener('click', () => this.close());
    this.shareToggleEl.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleShareMenu();
    });
    this.shareMenuEl.addEventListener('click', (event) => event.stopPropagation());

    this.nextEl.addEventListener('click', () => this.navigate(this.state.index + 1));

    const copyButton = this.shareMenuEl.querySelector('[data-share-copy]');
    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        const url = this.shareUrl();
        try {
          await navigator.clipboard.writeText(url);
          this.setShareNote('Link copied');
        } catch {
          this.setShareNote(url);
        }
      });
    }

    document.addEventListener('click', () => this.closeShareMenu());

    document.addEventListener('keydown', (event) => this.onKeyDown(event));

    // Remember that the reader took over: the reveal must not fight them
    // by resetting the scroll position underneath their hands.
    this.scrollerEl.addEventListener('wheel', () => {
      this.state.userScrolled = true;
    }, { passive: true });
    this.scrollerEl.addEventListener('touchstart', () => {
      this.state.userScrolled = true;
    }, { passive: true });
    this.scrollerEl.addEventListener('keydown', () => {
      this.state.userScrolled = true;
    });
    this.scrollerEl.addEventListener('scroll', () => {
      // Catch scrollbar dragging and programmatic assistive scrolling too.
      // The opening routine may still be waiting on fonts at this point.
      if (this.state.opening && this.scrollerEl.scrollTop > 0) {
        this.state.userScrolled = true;
      }
    }, { passive: true });
  }

  onKeyDown(event) {
    if (!this.state.open && !this.state.opening) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      if (event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      this.navigate(this.state.index + 1);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      this.navigate(this.state.index - 1);
      return;
    }

    if (event.key === 'Tab') this.trapFocus(event);
  }

  trapFocus(event) {
    const focusable = Array.from(this.root.querySelectorAll(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement,
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------------ *
   * content
   * ------------------------------------------------------------------ */

  render(project, index) {
    const total = this.projects.length;
    const position = String(index + 1).padStart(2, '0');

    // Never carry the previous project's reserved height into this layout.
    // The new title is measured after fonts are ready, then its own height is
    // reserved before the metadata and introduction are placed.
    this.root.style.removeProperty('--project-title-h');

    this.titleA11yEl.textContent = project.title;
    this.marquee.setText(project.title);

    this.kickerEl.replaceChildren(
      ...[
        `Project ${position} / ${String(total).padStart(2, '0')}`,
        project.year,
        project.kicker,
      ].map((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        return span;
      }),
    );

    if (this.counterEl) this.counterEl.textContent = `${position} / ${String(total).padStart(2, '0')}`;

    this.metaEl.replaceChildren(
      ...[
        ['Client', project.client],
        ['Year', project.year],
        ['Role', project.role],
        ['Disciplines', project.disciplines],
      ]
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => {
          const item = document.createElement('div');
          item.className = 'project__meta-item';

          const keyEl = document.createElement('span');
          keyEl.className = 'project__meta-key';
          keyEl.textContent = key;

          const valueEl = document.createElement('span');
          valueEl.className = 'project__meta-value';
          valueEl.textContent = value;

          item.append(keyEl, valueEl);
          return item;
        }),
    );

    this.introEl.textContent = project.summary;

    this.bodyEl.replaceChildren(...project.body.map((block) => this.renderBlock(block, index)));

    const next = this.projects[(index + 1) % total];
    this.nextEl.querySelector('[data-next-title]').textContent = next.title;

    this.root.dataset.project = project.id;
    if (window.location.hash !== `#/p/${project.id}`) {
      window.history.replaceState(null, '', `#/p/${project.id}`);
    }
  }

  renderBlock(block, index) {
    if (block.type === 'media') {
      const figure = document.createElement('figure');

      const frame = document.createElement('div');
      frame.className = `media${block.ratio ? ` media--${block.ratio}` : ''}`;

      const image = document.createElement('img');
      image.src = block.src;
      image.alt = block.alt ?? '';
      image.decoding = 'async';
      image.loading = index < 2 ? 'eager' : 'lazy';

      const reveal = () => image.classList.add('is-loaded');
      if (image.complete && image.naturalWidth > 0) reveal();
      else image.addEventListener('load', reveal, { once: true });
      image.addEventListener('error', reveal, { once: true });

      frame.append(image);
      figure.append(frame);

      if (block.caption) {
        const caption = document.createElement('figcaption');
        caption.className = 'media__caption';
        caption.textContent = block.caption;
        figure.append(caption);
      }
      return figure;
    }

    if (block.type === 'heading') {
      const heading = document.createElement('h2');
      heading.className = 'project__heading';
      heading.textContent = block.text;
      return heading;
    }

    if (block.type === 'quote') {
      const quote = document.createElement('blockquote');
      quote.className = 'project__quote';
      quote.textContent = block.text;
      if (block.cite) {
        const cite = document.createElement('cite');
        cite.className = 'project__meta-key';
        cite.textContent = block.cite;
        quote.append(cite);
      }
      return quote;
    }

    const paragraph = document.createElement('p');
    paragraph.textContent = block.text ?? '';
    return paragraph;
  }

  /* ------------------------------------------------------------------ *
   * opening
   * ------------------------------------------------------------------ */

  async open(index) {
    if (index < 0 || index >= this.projects.length) return;
    if (this.state.closing) return;

    // If another project is requested while the panel is already on screen,
    // use the same switch path as the Next control rather than arming a
    // second entrance over the first one.
    if (this.state.open || this.state.opening) {
      if (index === this.state.index) return;
      return this.navigate(index);
    }

    const token = ++this.state.token;
    const project = this.projects[index];

    this.state.index = index;
    this.state.savedScroll = window.scrollY;
    this.state.savedFocus = document.activeElement;
    this.state.userScrolled = false;
    this.state.opening = true;

    this.render(project, index);

    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
    // The panel stays invisible until the reveal starts, so the reader never
    // sees a frame of content that has not been animated yet.
    this.root.classList.add('is-armed');
    this.lockScroll(true);

    // Every project opens at the top of its own content.
    this.scrollerEl.scrollTop = 0;

    // Fonts and measurements first: the reveal starts from a settled layout.
    await fontsReady();
    if (token !== this.state.token) return;

    await this.measure();
    if (token !== this.state.token) return;

    if (!this.state.userScrolled) this.scrollerEl.scrollTop = 0;

    this.playEntrance();

    this.state.opening = false;
    this.state.open = true;
    this.onOpen?.(index, project);
  }

  /**
   * Reserve the space the title needs and size the marquee.
   * The title is measured *after* the font has resolved, so the metadata and
   * the description below it are never placed against a title that is still
   * going to change size.
   */
  async measure() {
    const titleHeight = Math.round(this.titleEl.getBoundingClientRect().height);
    this.root.style.setProperty('--project-title-h', `${titleHeight}px`);

    this.marquee.measure();

    await nextFrames(2);

    // Defensive: the title and the metadata must never overlap.
    const titleRect = this.titleEl.getBoundingClientRect();
    const metaRect = this.metaEl.getBoundingClientRect();
    if (metaRect.top < titleRect.bottom - 0.5) {
      console.warn('[project] the metadata overlaps the title', {
        titleBottom: titleRect.bottom,
        metaTop: metaRect.top,
      });
    }
  }

  /** The entrance: the title comes from above, the content rises from below. */
  playEntrance() {
    this.cancelAnimations();
    this.root.classList.remove('is-armed');
    this.root.classList.remove('is-switching');

    this.panelEl.focus({ preventScroll: true });

    if (prefersReducedMotion()) {
      this.titleEl.classList.remove('is-animating');
      this.stageEl.classList.remove('is-animating');
      this.marquee.reset();
      return;
    }

    this.titleEl.classList.add('is-animating');
    this.stageEl.classList.add('is-animating');

    const titleAnimation = animate(
      this.titleEl,
      [
        { transform: `translate3d(0, ${TITLE_OFFSET}px, 0)`, opacity: 0 },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ],
      { duration: DURATION.title, delay: 70, easing: EASE.outExpo },
    );

    const stageAnimation = animate(
      this.stageEl,
      [
        { transform: `translate3d(0, ${STAGE_OFFSET}px, 0)`, opacity: 0 },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ],
      { duration: DURATION.stage, delay: 130, easing: EASE.outExpo },
    );

    const backdropAnimation = animate(
      this.backdropEl,
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: DURATION.backdrop, easing: 'ease-out' },
    );

    this.animations = [titleAnimation, stageAnimation, backdropAnimation];

    const settle = () => {
      this.titleEl.classList.remove('is-animating');
      this.stageEl.classList.remove('is-animating');
    };
    Promise.all([titleAnimation.finished, stageAnimation.finished]).then(settle, settle);

    // The horizontal drift is a separate gesture. Start its quiet pause only
    // after the content stage has actually settled; a fixed delay from the
    // opening click could overlap the entrance on a slow device.
    stageAnimation.finished.then(
      () => {
        if (this.state.closing || (!this.state.open && !this.state.opening)) return;
        this.marquee.start({
          delay: DURATION.marqueeDelay,
          ramp: DURATION.marqueeRamp,
          speed: this.marqueeSpeed(),
        });
      },
      () => {},
    );
  }

  marqueeSpeed() {
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--marquee-speed'),
    );
    return Number.isFinite(value) && value > 0 ? value : 44;
  }

  /* ------------------------------------------------------------------ *
   * navigating between projects
   * ------------------------------------------------------------------ */

  async navigate(target) {
    if (this.state.closing) return;
    const total = this.projects.length;
    const index = ((target % total) + total) % total;
    if (index === this.state.index && !this.state.opening) return;

    const navToken = ++this.state.navToken;
    this.state.token += 1; // invalidate an opening measurement if one is pending
    this.state.index = index;
    this.state.opening = true;

    this.marquee.reset();
    this.root.classList.add('is-switching');
    this.cancelAnimations();

    // A short hold lets the previous panel leave before the next case study is
    // measured. The token prevents fast repeated navigation from rendering a
    // stale selection over the latest one.
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (navToken !== this.state.navToken || this.state.closing) return;

    this.render(this.projects[index], index);
    this.scrollerEl.scrollTop = 0;
    await this.measure();
    if (navToken !== this.state.navToken || this.state.closing) return;

    this.playEntrance();
    this.state.opening = false;
    this.state.open = true;
    this.onChange?.(index, this.projects[index]);
  }

  /* ------------------------------------------------------------------ *
   * closing
   * ------------------------------------------------------------------ */

  async close() {
    if ((!this.state.open && !this.state.opening) || this.state.closing) return;

    this.state.token += 1;
    this.state.navToken += 1;
    this.state.closing = true;
    this.marquee.stop();
    this.closeShareMenu();

    // Continue from wherever the entrance happens to be, so closing in the
    // middle of the reveal does not snap.
    const titleTransform = currentTransform(this.titleEl);
    const titleOpacity = currentOpacity(this.titleEl);
    const stageTransform = currentTransform(this.stageEl);
    const stageOpacity = currentOpacity(this.stageEl);
    const backdropOpacity = currentOpacity(this.backdropEl);

    this.cancelAnimations();

    const duration = prefersReducedMotion() ? 1 : DURATION.exit;

    const exits = [
      animate(
        this.titleEl,
        [
          { transform: titleTransform, opacity: titleOpacity },
          { transform: 'translate3d(0, -26px, 0)', opacity: 0 },
        ],
        { duration, easing: EASE.inOutSoft },
      ),
      animate(
        this.stageEl,
        [
          { transform: stageTransform, opacity: stageOpacity },
          { transform: 'translate3d(0, 44px, 0)', opacity: 0 },
        ],
        { duration, easing: EASE.inOutSoft },
      ),
      animate(
        this.backdropEl,
        [{ opacity: backdropOpacity }, { opacity: 0 }],
        { duration, easing: EASE.inOutSoft },
      ),
      animate(
        this.panelEl,
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.988)', opacity: 0.94 },
        ],
        { duration, easing: EASE.inOutSoft },
      ),
    ];

    this.animations = exits;
    await Promise.all(exits.map((animation) => animation.finished.catch(() => {})));

    this.teardown();
  }

  teardown() {
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.marquee.reset();

    this.root.hidden = true;
    this.root.classList.remove('is-switching');
    this.root.classList.add('is-armed');
    this.root.style.removeProperty('--project-title-h');
    this.root.setAttribute('aria-hidden', 'true');
    this.lockScroll(false);

    this.titleEl.classList.remove('is-animating');
    this.stageEl.classList.remove('is-animating');

    // The scroll position of the project is reset only now — after the exit.
    // Closing from a scrolled position therefore never jumps to the top.
    this.scrollerEl.scrollTop = 0;

    const index = this.state.index;
    this.state.open = false;
    this.state.opening = false;
    this.state.closing = false;

    // Back to the mosaic, exactly where the reader left it.
    window.scrollTo(0, this.state.savedScroll);
    this.onClose?.(index);
  }

  /* ------------------------------------------------------------------ *
   * share
   * ------------------------------------------------------------------ */

  toggleShareMenu() {
    const open = this.shareMenuEl.hasAttribute('hidden');
    if (open) {
      this.shareMenuEl.removeAttribute('hidden');
      this.shareToggleEl.setAttribute('aria-expanded', 'true');
    } else {
      this.closeShareMenu();
    }
  }

  closeShareMenu() {
    if (!this.shareMenuEl.hasAttribute('hidden')) {
      this.shareMenuEl.setAttribute('hidden', '');
      this.shareToggleEl.setAttribute('aria-expanded', 'false');
    }
  }

  setShareNote(text) {
    if (!this.shareNoteEl) return;
    this.shareNoteEl.textContent = text;
  }

  shareUrl() {
    return window.location.href;
  }

  /* ------------------------------------------------------------------ *
   * helpers
   * ------------------------------------------------------------------ */

  cancelAnimations() {
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
  }

  lockScroll(locked) {
    document.documentElement.classList.toggle('is-locked', locked);
    document.body.classList.toggle('is-locked', locked);
  }

  /** The position of the tile the project was opened from. */
  tileOrigin(index = this.state.index) {
    const rect = this.getTileRect?.(index);
    if (!rect) return '50% 40%';
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return `${x}px ${y}px`;
  }
}
