import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  MARQUEE_TOLERANCE_PX,
  OFFSET,
  REVEAL,
  entranceKeyframes,
  exitKeyframes,
  marqueeNeedsDrift,
  planReveal,
  positionLabel,
} from '@/lib/portfolio/reveal'

/**
 * The reveal's contract with the reader and with the stylesheet.
 *
 * Two surfaces must agree: the DOM animation (these constants) and
 * `src/styles/tokens.css` (the custom-property names). They can drift silently — a
 * designer tweaks 1000 → 1200 in one file and the reveal loses its rhythm — so the
 * parity is asserted here, where a stale number cannot hide.
 */

describe('reveal planning', () => {
  it('plays the entrance only when both the operator and the reader allow motion', () => {
    expect(planReveal({ reducedMotion: false }).animate).toBe(true)
    expect(planReveal({ reducedMotion: false, revealEnabled: false }).animate).toBe(false)
    expect(planReveal({ reducedMotion: true }).animate).toBe(false)
    // Reduced motion wins by *omission*, never by pretending the entrance happened.
  })

  it('starts the drift only with the entrance and only when enabled', () => {
    expect(planReveal({ marqueeEnabled: true, reducedMotion: false }).marquee).toBe(true)
    expect(planReveal({ marqueeEnabled: true, reducedMotion: true }).marquee).toBe(false)
    expect(planReveal({ marqueeEnabled: false, reducedMotion: false }).marquee).toBe(false)
  })

  it('clamps the drift speed to the storefront bounds the manifest declares', () => {
    expect(planReveal({ reducedMotion: false, speed: 4 }).marqueeSpeed).toBe(8)
    expect(planReveal({ reducedMotion: false, speed: 999 }).marqueeSpeed).toBe(120)
    expect(planReveal({ reducedMotion: false, speed: 44 }).marqueeSpeed).toBe(44)
    expect(planReveal({ reducedMotion: false, speed: Number.NaN }).marqueeSpeed).toBe(44)
  })
})

describe('overflow decision', () => {
  it('a title that fits is never moved, with the same tolerance everywhere', () => {
    expect(marqueeNeedsDrift(1000, 1280)).toBe(false)
    // One pixel of slack still counts as fitting: 1281 in a 1280 column stays still.
    expect(marqueeNeedsDrift(1281, 1280)).toBe(false)
    expect(marqueeNeedsDrift(1282, 1280)).toBe(true)
    expect(marqueeNeedsDrift(1280 + MARQUEE_TOLERANCE_PX, 1280)).toBe(false)
    expect(marqueeNeedsDrift(Number.NaN, 1280)).toBe(false)
    expect(marqueeNeedsDrift(200, Number.NaN)).toBe(false)
  })
})

describe('keyframes mirror the timing scale', () => {
  it('the entrance travels from the offsets above and below, in the declared order', () => {
    const entrance = entranceKeyframes()
    expect(entrance.title.at(0)!.transform).toBe(`translate3d(0, ${OFFSET.enterTitle}px, 0)`)
    expect(entrance.stage.at(0)!.transform).toBe(`translate3d(0, ${OFFSET.enterStage}px, 0)`)
    expect(entrance.title.at(-1)).toEqual({ transform: 'translate3d(0, 0, 0)', opacity: 1 })
    expect(entrance.stage.at(-1)).toEqual({ transform: 'translate3d(0, 0, 0)', opacity: 1 })
  })

  it('the exit continues from wherever the reader was, never a hard reset', () => {
    const exit = exitKeyframes({ stageOpacity: 0.5, stageTransform: 'translate3d(0, 30px, 0)', titleOpacity: 1, titleTransform: 'none' })
    expect(exit.title.at(0)!.transform).toBe('none')
    expect(exit.stage.at(0)!.transform).toBe('translate3d(0, 30px, 0)')
    expect(exit.title.at(-1)).toEqual({ transform: `translate3d(0, ${OFFSET.exitTitle}px, 0)`, opacity: 0 })
    expect(exit.stage.at(-1)).toEqual({ transform: `translate3d(0, ${OFFSET.exitStage}px, 0)`, opacity: 0 })
  })
})

describe('CSS tokens keep time with the engine', () => {
  const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

  it('publishes every reveal duration as a token', () => {
    const expectToken = (name: string, ms: number): void => {
      expect(tokens, `${name} is not ${ms}ms in tokens.css`).toContain(`${name}: ${ms}ms`)
    }
    expectToken('--dur-backdrop', REVEAL.backdrop)
    expectToken('--dur-title', REVEAL.title)
    expectToken('--dur-stage', REVEAL.stage)
    expectToken('--dur-exit', REVEAL.exit)
    expectToken('--marquee-delay', REVEAL.marqueeDelay)
    expectToken('--marquee-ramp', REVEAL.marqueeRamp)
    expect(tokens).toContain(`--marquee-speed: ${REVEAL.marqueeSpeed}px`)
  })

  it('the marquee gap is a token too, so JS and CSS measure the same copy width', () => {
    expect(tokens).toMatch(/--marquee-gap:\s*[\d.]+em/u)
  })
})

describe('archive numerals', () => {
  it('pads to two digits and never invents a work', () => {
    expect(positionLabel(0, 9)).toBe('01 / 09')
    expect(positionLabel(12, 24)).toBe('13 / 24')
    expect(positionLabel(0, 0)).toBe('01 / 00')
  })
})
