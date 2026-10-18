/**
 * Frame navigation for a phone-width viewport.
 *
 * Above the rail breakpoint the sidebar column carries the New Session button,
 * the panel rows, the workspace browser, search, and Settings. A phone has no
 * width to spare for that column, so the frame drops it and this plugin
 * contributes the same choices to the composer's dock as one icon row beneath
 * the turn, step and token readouts. Selecting a panel opens it as a bottom
 * sheet over the conversation; the settings and sidebar sheets are owned by
 * their own surfaces.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the shortcuts Context merge (ctx.shortcuts catalog).
import type {} from '@deepseek-ai/dsh-client-shortcuts/client'
// Type-only: pulls the ui-conversation SlotMap merge for the composer dock seat.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the renderer's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings-general Context merge (ctx.settingsPanel).
import type {} from '@deepseek-ai/dsh-client-ui-settings-general/client'
// Type-only: pulls the workspace Context merge (ctx.uiWorkspace).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { ComposerPanelControls } from './ComposerPanelControls.tsx'
import { en, NS, zh, type PanelControlsKey } from './locales.ts'

export const name = 'ui-panel-controls'
export const inject = ['slots', 'layout', 'locale', 'uiWorkspace', 'shortcuts']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The narrow-viewport panel opener row's copy. */
    'ui-panel-controls': PanelControlsKey
  }
}

/**
 * Client plugin body: mirror the sidebar rail's choices into the composer dock
 * for viewports that have no rail.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-panel-controls: copy')

  // The seat renders on every composer variant, so the row exists on the
  // landing surface and inside a Session alike — the landing surface is where a
  // phone most needs it, and no Session has started there yet.
  ctx.slots.inject('conversation.composer.controls', () => {
    return ctx.slots.register({
      name: 'conversation.composer.controls',
      id: 'panel-controls',
      order: -1,
      locale: NS,
      inject: () => ({
        newSession: () => { ctx.uiWorkspace.startSession() },
        openPlugins: () => { ctx.layout.selectPanel('plugins' as MainPanelId) },
        openSchedules: () => { ctx.layout.selectPanel('schedules' as MainPanelId) },
        // The workspace browser and search live in the sidebar's own region, so
        // presenting them means presenting the sidebar itself.
        openWorkspaces: () => { ctx.layout.presentSidebar() },
        // Settings lives behind a client service rather than a slot: its
        // surface is body-portalled and mounts once, so presenting it means
        // opening the existing shell instead of rendering a second copy.
        openSettings: () => { ctx.get('settingsPanel')?.open(undefined) },
        searchSessions: () => {
          // The region's search control is the only way into its search state;
          // the collapsed rail carries that control, and clicking it runs the
          // same request path as the keyboard shortcut — the sidebar sheet
          // expands with the field focused. The control is found by the
          // `session.search` binding it advertises, which excludes the region's
          // other shortcut-bound actions. A frame without the control falls
          // back to presenting the sidebar.
          const aria = ctx.shortcuts.catalog.getSnapshot()
            .find(row => String(row.id) === 'session.search')?.aria
          const scope = document.querySelector('[data-slot="sidebar.workspaces"]')
          const control = aria === undefined || scope === null
            ? undefined
            : scope.querySelector(`button[aria-keyshortcuts="${CSS.escape(aria)}"]`)
          if (control instanceof HTMLElement) control.click()
          else ctx.layout.presentSidebar()
        },
      }),
    }, ComposerPanelControls)
  })
}

export type { ComposerPanelControlsProps } from './ComposerPanelControls.tsx'
export type { PanelControlsKey } from './locales.ts'
