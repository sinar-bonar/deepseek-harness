// @vitest-environment jsdom
/** Panel opener row: one icon button per sidebar action, shown only on a phone frame. */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ComposerPanelControls } from '../src/client/ComposerPanelControls.tsx'

/** Renders the seat with a fixed geometry decision and spied openers. */
function mount(composerOpeners: boolean): {
  container: HTMLElement
  openers: Record<string, ReturnType<typeof vi.fn>>
} {
  const openers = {
    newSession: vi.fn(),
    openPlugins: vi.fn(),
    openSchedules: vi.fn(),
    openWorkspaces: vi.fn(),
    openSettings: vi.fn(),
    searchSessions: vi.fn(),
  }
  const props = {
    usePanelGeometry: <T,>(select: (state: { composerOpeners: boolean }) => T): T => select({ composerOpeners }),
    ...openers,
    t: (key: string) => key,
  } as unknown as Parameters<typeof ComposerPanelControls>[0]
  const { container } = render(ComposerPanelControls(props))
  return { container, openers }
}

describe('ComposerPanelControls', () => {
  it('renders the six sidebar actions in one row', () => {
    const { container } = mount(true)
    const targets = [...container.querySelectorAll('[data-composer-open]')]
      .map(node => node.getAttribute('data-composer-open'))
    expect(targets).toEqual(['new-session', 'plugins', 'schedules', 'workspaces', 'settings', 'search'])
  })

  it('opens the surface the tapped control names', () => {
    const { container, openers } = mount(true)
    container.querySelector<HTMLElement>('[data-composer-open="plugins"]')!.click()
    expect(openers.openPlugins).toHaveBeenCalledTimes(1)
    container.querySelector<HTMLElement>('[data-composer-open="search"]')!.click()
    expect(openers.searchSessions).toHaveBeenCalledTimes(1)
  })

  it('renders nothing while the sidebar rail is on screen', () => {
    expect(mount(false).container.querySelector('[data-composer-panel-controls]')).toBeNull()
  })
})
