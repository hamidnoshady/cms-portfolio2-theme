# CMS Portfolio 2 Theme

A responsive portfolio/archive theme with a project mosaic and a full-screen case-study view. Project content lives in [`data/projects.json`](data/projects.json); the artwork is self-hosted under [`assets/media`](assets/media).

## Preview

```sh
npm run dev
```

The static preview server binds to `0.0.0.0:4173`, which works with Arena's live preview proxy. Open the port preview, select any tile, and use Share / Close or the Next Project control.

## Project reveal behavior

- The project title is the first block in the project scroller. It is in normal document flow (not fixed or sticky), so it scrolls away naturally.
- Share and Close are the only sticky elements, and stick inside the project scroller.
- The title enters from above while the content stage rises from below. Both use the same easing family, and their temporary transforms are removed on completion.
- Fonts and title measurements are resolved before the entrance begins. Each project opens at `scrollTop = 0`.
- The horizontal title marquee is isolated on its own track. It waits until the entrance settles, then eases into its motion; reduced-motion preferences disable it.
- Media frames reserve their aspect ratio and use a steady neutral background while their image is loading.
- Close animates from the current scrolled position, then restores the mosaic position and returns focus to the originating tile.

## Browser verification and recording

Install the development dependencies once, then run:

```sh
npm install
npm run verify
npm run record
```

`npm run verify` exercises desktop and mobile project opening, entrance timing, marquee timing, scrolling during entrance, sticky controls, closing from a scrolled position, and reopening multiple projects. It uses a locally installed Playwright Chromium when available and falls back to the self-contained `@sparticuz/chromium` package.

`npm run record` writes a short WebM recording of the mosaic-to-project reveal to [`recordings/project-reveal.webm`](recordings/project-reveal.webm).

## Artwork

The compact vector placeholder artwork is deterministic and can be regenerated with:

```sh
npm run media
```
