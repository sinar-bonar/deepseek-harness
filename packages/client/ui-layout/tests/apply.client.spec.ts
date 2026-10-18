// @vitest-environment jsdom

import ShortcutsService from '../../shortcuts/src/client/index.ts'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { stubConfigForm } from '@deepseek-ai/dsh-client-test-runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { HostObservable, SlotRendererHost } from '@deepseek-ai/dsh-client-ui-slots'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply as themeApply, inject as themeInject, ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import { apply, inject, LayoutController } from '@deepseek-ai/dsh-client-ui-layout/client'
import { apply as nodeApply } from '@deepseek-ai/dsh-client-ui-layout'
import type { MainPanelId, PanelGeometry } from '../src/client/service.ts'
import type { createLayoutStore } from '../src/client/stores.ts'

const owners = new Set<Fiber>()
let originalRootStyle: string | null
let originalBodyStyle: string | null
let originalDarkTheme: string | null
let originalThemeMetadata: Element[]

beforeEach(() => {
  originalRootStyle = document.documentElement.getAttribute('style')
  originalBodyStyle = document.body.getAttribute('style')
  originalDarkTheme = document.body.getAttribute('data-ds-dark-theme')
  originalThemeMetadata = [...document.head.querySelectorAll('meta[name="theme-color"]')]
  originalThemeMetadata.forEach((node) => { node.remove() })
  vi.stubGlobal('innerWidth', 1920)
})

afterEach(async () => {
  try {
    for (const owner of owners) await owner.dispose()
  } finally {
    owners.clear()
    restoreAttribute(document.documentElement, 'style', originalRootStyle)
    restoreAttribute(document.body, 'style', originalBodyStyle)
    restoreAttribute(document.body, 'data-ds-dark-theme', originalDarkTheme)
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((node) => { node.remove() })
    document.head.append(...originalThemeMetadata)
    vi.unstubAllGlobals()
  }
})

function restoreAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name)
  else element.setAttribute(name, value)
}

async function bench() {
  const root = new Context()
  let ctx: Context | undefined
  const owner = root.plugin((ownedContext: Context) => { ctx = ownedContext })
  owners.add(owner)
  await owner.await()
  if (ctx === undefined) throw new Error('the fixture owner did not activate')
  const slotsFiber = ctx.plugin(SlotRegistry)
  ctx.provide('locale', new LocaleRuntime(ctx))
  await ctx.plugin(ShortcutsService).await()
  // ui-theme's Appearance row binds a durable scope through these two.
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('configForms', { developerTools: { enabled: createSnapshotStore(true) }, get: () => stubConfigForm().scope } as never)
  await ctx.plugin({ inject: themeInject, apply: themeApply }).await()
  await slotsFiber.await()
  const slots = ctx.get('slots') as SlotRegistry
  let host: SlotRendererHost | undefined
  slots.install({ renderRoot: (value) => { host = value; return null } })
  const rendererHost = (): SlotRendererHost => {
    slots.renderSlot('root', {})
    if (host === undefined) throw new Error('the root renderer did not receive its host')
    return host
  }
  return { ctx, slots, rendererHost }
}

describe('ui-layout client apply', () => {
  it('declares its service dependencies', () => {
    expect(inject).toEqual(['slots', 'theme', 'locale', 'shortcuts'])
  })

  it('provides ctx.layout and declares the root-scoped frame slots', async () => {
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(ctx.get('layout')).toBeInstanceOf(LayoutController)
    expect(slots.entries('root')).toHaveLength(1)
    expect(slots.spec('sidebar')).toEqual({ kind: 'single', scope: 'root' })
    expect(slots.spec('main')).toEqual({ kind: 'keyed', scope: 'root' })
    expect(slots.spec('rightbar')).toEqual({ kind: 'single', scope: 'root' })
    expect(slots.spec('shell.bottom')).toEqual({ kind: 'single', scope: 'root' })
    expect(slots.spec('shell.overlay')).toEqual({ kind: 'list', scope: 'root' })
    expect(slots.spec('shell.leading')).toEqual({ kind: 'single', scope: 'root' })
  })

  it('shares a pre-created instance between service actions, root rendering, and panelInfo', async () => {
    const { ctx, slots, rendererHost } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = slots.entries('root')[0]!
    expect(entry.inject).toBeUndefined()
    const handle = entry.store as ReturnType<typeof createLayoutStore>
    const instance = handle.create()
    expect(handle.create()).toBe(instance)
    const layout = ctx.get('layout') as LayoutController
    expect(() => { layout.selectPanel('missing' as MainPanelId) }).toThrow('main panel "missing" is not registered')
    layout.toggleSidebar()
    expect(instance.getSnapshot().layoutInfo.sidebar).toBe(0)
    const host = rendererHost()
    expect(host.storeOf(entry, undefined)).toBe(instance)
    const panelInfo = host.root.getSnapshot().hooks.panelInfo!
    expect(panelInfo).toBe(layout.panelInfo)
    expect(panelInfo.getSnapshot()).toBe(instance.getSnapshot().panelInfo)
    const geometry = host.root.getSnapshot().hooks.panelGeometry!
    expect(geometry).toBe(layout.panelGeometry)
    const panelId = 'panel-a' as MainPanelId
    const disposePanel = slots.register({ name: 'main', key: panelId }, () => null)
    layout.selectPanel(panelId)
    expect(panelInfo.getSnapshot()).toEqual({ activePanelId: panelId })
    disposePanel()
    await vi.waitFor(() => { expect(panelInfo.getSnapshot()).toEqual({ activePanelId: null }) })
    expect(() => { layout.selectPanel(panelId) }).toThrow('main panel "panel-a" is not registered')
    expect(instance.getSnapshot().layoutInfo.sidebar).toBe(0)
    const pending = layout.beginNavigation()
    await fiber.dispose()
    expect(pending.aborted).toBe(true)
  })

  it('publishes composer openers only while a phone-width frame keeps the panel closed', async () => {
    const { ctx, slots, rendererHost } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const geometry = rendererHost().root.getSnapshot().hooks.panelGeometry as HostObservable<PanelGeometry>
    const instance = (slots.entries('root')[0]!.store as ReturnType<typeof createLayoutStore>).create()
    // Wide: the rail carries the opener, so the composer stays clear.
    expect(geometry.getSnapshot().composerOpeners).toBe(false)
    instance.actions.setViewportWidth(480)
    // Phone width with the panel closed: the composer takes over.
    expect(geometry.getSnapshot()).toEqual({ viewportWidth: 480, sidebarExpanded: false, composerOpeners: true, narrowPanels: true })
    instance.actions.toggleSidebar()
    // Open sheet: its scrim is already the way back, so the seat withdraws.
    expect(geometry.getSnapshot()).toEqual({ viewportWidth: 480, sidebarExpanded: true, composerOpeners: false, narrowPanels: true })
    instance.actions.toggleSidebar()
    // Back to a rail width with the sidebar re-expanded by the toggle: the
    // frame's own control is back, and the composer seat stays out of the way.
    instance.actions.setViewportWidth(1440)
    expect(geometry.getSnapshot()).toEqual({ viewportWidth: 1440, sidebarExpanded: true, composerOpeners: false, narrowPanels: false })
    // A wide frame with the sidebar closed still has its rail, so the composer
    // seat must not appear there either.
    instance.actions.toggleSidebar()
    expect(geometry.getSnapshot()).toEqual({ viewportWidth: 1440, sidebarExpanded: false, composerOpeners: false, narrowPanels: false })
    await fiber.dispose()
  })

  it('closes the sidebar sheet when a panel is selected on a phone frame', async () => {
    const { ctx, slots, rendererHost } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const geometry = rendererHost().root.getSnapshot().hooks.panelGeometry as HostObservable<PanelGeometry>
    const instance = (slots.entries('root')[0]!.store as ReturnType<typeof createLayoutStore>).create()
    instance.actions.setViewportWidth(480)
    expect(geometry.getSnapshot().composerOpeners).toBe(true)
    const panelId = 'panel-sheet' as MainPanelId
    const disposePanel = slots.register({ name: 'main', key: panelId }, () => null)
    // The selected panel is shown in its own sheet, so an open sidebar sheet
    // must yield instead of covering it.
    instance.actions.presentSidebarSheet()
    expect(geometry.getSnapshot().sidebarExpanded).toBe(true)
    ctx.get('layout')!.selectPanel(panelId)
    expect(geometry.getSnapshot()).toEqual({ viewportWidth: 480, sidebarExpanded: false, composerOpeners: true, narrowPanels: true })
    // A wide frame keeps its track, so selection leaves the sidebar state alone.
    instance.actions.setViewportWidth(1440)
    instance.actions.setSidebar(280)
    ctx.get('layout')!.selectPanel(panelId)
    expect(geometry.getSnapshot()).toEqual({ viewportWidth: 1440, sidebarExpanded: true, composerOpeners: false, narrowPanels: false })
    disposePanel()
    await fiber.dispose()
  })

  it('theme presenter applies the initial snapshot, follows theme/change, and unwinds on dispose', async () => {
    const { ctx } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    // Initial getter application: jsdom has no matchMedia, system resolves light.
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(false)
    const themeColorMeta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    expect(themeColorMeta).not.toBeNull()
    const theme = ctx.get('theme') as ThemeRuntime
    theme.setTheme('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(true)
    expect(document.head.querySelector('meta[name="theme-color"]')).toBe(themeColorMeta)
    await fiber.dispose()
    expect(document.documentElement.style.colorScheme).toBe('')
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(false)
    expect(themeColorMeta?.isConnected).toBe(false)
    // Listener is off: further theme changes no longer reach the document.
    theme.setTheme('light')
    theme.setTheme('dark')
    expect(document.documentElement.style.colorScheme).toBe('')
    expect(document.body.hasAttribute('data-ds-dark-theme')).toBe(false)
  })

  it('teardown unwinds the service, the root registration, and the child declarations', async () => {
    const { ctx, slots, rendererHost } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const host = rendererHost()
    expect(host.root.getSnapshot().hooks.panelInfo).toBeDefined()
    expect(host.root.getSnapshot().hooks.panelGeometry).toBeDefined()
    await fiber.dispose()
    expect(ctx.get('layout')).toBeUndefined()
    expect(slots.entries('root')).toHaveLength(0)
    expect(slots.spec('sidebar')).toBeUndefined()
    expect(slots.spec('main')).toBeUndefined()
    expect(slots.spec('rightbar')).toBeUndefined()
    expect(slots.spec('shell.bottom')).toBeUndefined()
    expect(slots.spec('shell.overlay')).toBeUndefined()
    expect(slots.spec('shell.leading')).toBeUndefined()
    expect(host.root.getSnapshot().hooks.panelInfo).toBeUndefined()
    expect(host.root.getSnapshot().hooks.panelGeometry).toBeUndefined()
    // The built-in root declaration survives entry teardown (renderer-owned).
    expect(slots.spec('root')).toEqual({ kind: 'single', scope: 'root' })
  })
})

describe('node half', () => {
  it('node apply is an intentional no-op (loader-managed lifecycle only)', () => {
    nodeApply()
    expect(true).toBe(true) // reaching here without throw is the contract
  })
})
