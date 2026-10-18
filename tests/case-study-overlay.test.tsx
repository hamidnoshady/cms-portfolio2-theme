// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CaseStudyPanel } from '@/components/case/CaseStudyPanel'

/**
 * Opening a work *over* the mosaic.
 *
 * jsdom has no layout and no Web Animations API, so the animated gestures themselves
 * are proven by the browser audit (`scripts/interaction-audit.mjs`). What belongs here
 * is everything about the panel that must hold *regardless* of the animation: dialog
 * semantics, the reader's focus and title never being stranded, the background being
 * frozen, and Escape closing to the archive — including the reduced-motion path, where
 * nothing may be left mid-transform.
 */

const back = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, forward: vi.fn(), prefetch: vi.fn(), push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}))

const labels = { copied: 'Copied', copyLink: 'Copy link', done: 'Copied', failed: 'Failed', share: 'Share' }

const matchMedia = (reduced: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    addEventListener: vi.fn(),
    matches: query.includes('reduce') ? reduced : false,
    media: query,
    removeEventListener: vi.fn(),
  }))

const renderPanel = (over: Partial<Parameters<typeof CaseStudyPanel>[0]> = {}) =>
  render(
    <CaseStudyPanel
      closeLabel="Close"
      dir="ltr"
      labels={labels}
      marqueeEnabled={false}
      next={null}
      revealEnabled={false}
      shareUrl="https://example.test/projects/sable"
      title="Sable & Salt"
      workKey="projects:p-1"
      {...over}
    >
      <p>Case study body</p>
    </CaseStudyPanel>,
  )

const flush = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

beforeEach(() => {
  back.mockClear()
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-case-open')
  document.title = 'Studio'
})

describe('CaseStudyPanel', () => {
  it('is a labelled modal dialog, with the title reachable for assisted tech', async () => {
    matchMedia(false)
    const { container } = renderPanel()
    await flush()
    const dialog = container.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Sable & Salt')
    // The visible marquee copy is decorative; the heading name lives in the h1.
    expect(dialog.querySelector('h1')?.textContent).toBe('Sable & Salt')
    expect(dialog.querySelector('.case__marquee')?.getAttribute('aria-hidden')).toBe('true')
    // One copy only while the widths have not been measured (and a fitting title keeps it).
    expect(dialog.querySelectorAll('.case__title-text')).toHaveLength(1)
  })

  it('freezes the background and hands the page back on unmount', async () => {
    matchMedia(false)
    const { unmount } = renderPanel()
    await flush()
    expect(document.documentElement.getAttribute('data-case-open')).toBe('true')
    unmount()
    expect(document.documentElement.getAttribute('data-case-open')).toBeNull()
  })

  it('traps Tab inside the dialog and restores the opener on close', async () => {
    matchMedia(false)
    const opener = document.createElement('a')
    opener.href = '/'
    document.body.append(opener)
    opener.focus()

    const { container, unmount } = renderPanel()
    await flush()
    const focusable = [...container.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a[href], button:not([disabled])')]
    expect(focusable.length).toBeGreaterThan(1)

    const last = focusable.at(-1)!
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(focusable[0])

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps the browser tab title in step while the work is open', async () => {
    matchMedia(false)
    const { unmount } = renderPanel()
    await flush()
    expect(document.title).toBe('Sable & Salt')
    unmount()
    expect(document.title).toBe('Studio')
  })

  it('Escape closes to the archive in one route call, with nothing left animating', async () => {
    matchMedia(true) // reduced motion: there must be no animation to forget mid-flight
    const { unmount } = renderPanel()
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(back).toHaveBeenCalledTimes(1)
    // The mocked router cannot unmount the intercepted slot the way Next does; doing
    // it by hand is what proves the teardown hands the page back.
    unmount()
    expect(document.documentElement.getAttribute('data-case-open')).toBeNull()
  })

  it('Escape is never double-handled while the close is in progress', async () => {
    matchMedia(true)
    renderPanel()
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(back).toHaveBeenCalledTimes(1)
  })
})
