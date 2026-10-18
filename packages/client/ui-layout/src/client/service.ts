/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry and main-panel selection live in the root layout store;
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (main-panel selection and sidebar toggle,
 * right-panel show/hide from ui-sidebar-right) — writes stay inside the
 * store's declared action set, shared with the root registration.
 */
import type { BoundActions, HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { Branded } from '@deepseek-ai/dsh-brand'
import { PANEL_SHEET_MAX } from './columns.ts'
import type { createLayoutStore } from './stores.ts'

/** Identity shared by a sidebar panel entry and its main-slot occupant. */
export type MainPanelId = Branded<'MainPanelId'>

/** Root-scoped navigation state exposed to panel-aware components. */
export interface PanelInfo {
  /** Selected global panel; null displays the current Conversation. */
  readonly activePanelId: MainPanelId | null
}

/**
 * Root-scoped panel geometry, published for seats outside this package that
 * adapt to the frame width. The values mirror the layout store's own decision
 * fields, so a consumer never restates a breakpoint or keeps a second copy of
 * the viewport state.
 */
export interface PanelGeometry {
  /** Current frame width in px. */
  readonly viewportWidth: number
  /** Whether the sidebar renders expanded at this width. */
  readonly sidebarExpanded: boolean
  /**
   * Whether a viewport this narrow needs the composer's own panel opener. The
   * frame drops the sidebar rail below the sheet breakpoint, and the composer
   * takes over — but only while the panel is closed, since an open sheet's
   * scrim is already the way back.
   */
  readonly composerOpeners: boolean
  /**
   * Whether this viewport is narrow enough that a panel-sized surface belongs in
   * a bottom sheet rather than a centered dialog. Shared so every panel chooses
   * the same breakpoint instead of each surface inventing one.
   */
  readonly narrowPanels: boolean
}

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/** Panel navigation and geometry actions exposed through ctx.layout. */
export interface ILayout {
  /** Selected central panel from the same root store used by `usePanelInfo`. */
  readonly panelInfo: HostObservable<PanelInfo>
  /**
   * Live frame width and sidebar state from the same root store the frame
   * renders. A seat that adapts to a narrow frame reads this instead of
   * creating a second layout store, which would carry its own stale state.
   */
  readonly panelGeometry: HostObservable<PanelGeometry>
  /**
   * Select a global central panel without changing the current Session.
   * @param panelId - registered main key, or null to show the Conversation.
   * @throws if the selected main key is not registered; preserves the current selection.
   */
  selectPanel(panelId: MainPanelId | null): void
  /**
   * Start an asynchronous navigation, superseding any earlier pending navigation.
   * @returns a signal aborted by the next navigation or layout disposal; check it before committing UI state.
   */
  beginNavigation(): AbortSignal
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /**
   * Present the sidebar without toggling it: expand it on a narrow frame, open
   * the track on a wide one, and leave an already-presented sidebar alone. A
   * caller asking to see something the sidebar owns cannot express that as a
   * toggle, which would close an open sidebar instead of revealing it.
   */
  presentSidebar(): void
  /**
   * Report the right panel's presentation without changing its expanded state.
   * @param track - whether the normal panel width reserves a grid track,
   *   including beneath a fullscreen overlay.
   * @param fullscreen - whether the panel covers the frame and hides its outer
   *   resize handle; independent of the underlying grid track.
   */
  openRightbar(track: boolean, fullscreen: boolean): void
  /** Report the right panel as hidden: no track, no handle. */
  closeRightbar(): void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  private navigation = new AbortController()

  /**
   * @param panels - actions of the instance shared with the root entry.
   * @param hasMainPanel - checks the live main-slot registry for a panel id.
   * @param panelInfo - root store's shared central-panel selection source.
   * @param panelGeometry - root store's shared viewport and sidebar state.
   */
  constructor(
    private readonly panels: PanelActions,
    private readonly hasMainPanel: (id: MainPanelId) => boolean,
    readonly panelInfo: HostObservable<PanelInfo>,
    readonly panelGeometry: HostObservable<PanelGeometry>,
  ) {}

  /** Select a global panel or return to the Conversation. */
  selectPanel(panelId: MainPanelId | null): void {
    if (panelId !== null && !this.hasMainPanel(panelId)) {
      throw new Error(`layout.selectPanel: main panel "${panelId}" is not registered`)
    }
    this.navigation.abort()
    // A phone shows the selected panel in a sheet over the conversation, so an
    // open sidebar sheet must yield: both would otherwise cover the viewport,
    // and the panel the caller asked for would stay behind the drawer.
    if (panelId !== null && this.panelGeometry.getSnapshot().viewportWidth <= PANEL_SHEET_MAX) {
      this.panels.collapseSidebar()
    }
    this.panels.selectPanel(panelId)
  }

  /** @returns the new pending navigation's cancellation signal. */
  beginNavigation(): AbortSignal {
    this.navigation.abort()
    this.navigation = new AbortController()
    return this.navigation.signal
  }

  /** Invalidate pending navigations when the layout owner is unloaded. */
  dispose(): void {
    this.navigation.abort()
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.panels.toggleSidebar()
  }

  /** Present the sidebar without toggling an already-presented one. */
  presentSidebar(): void {
    this.panels.presentSidebarSheet()
  }

  /** Report the right panel's track and fullscreen presentation. */
  openRightbar(track: boolean, fullscreen: boolean): void {
    this.panels.openRightbar(track, fullscreen)
  }

  /** Report the right panel as hidden: no track, no handle. */
  closeRightbar(): void {
    this.panels.closeRightbar()
  }
}
