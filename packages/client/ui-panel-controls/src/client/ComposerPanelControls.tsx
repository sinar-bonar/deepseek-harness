/**
 * Frame-navigation controls for a phone-width viewport.
 *
 * Above the rail breakpoint the sidebar column carries the New Session button,
 * one row per registered panel, the workspace browser, search, and Settings. A
 * phone has no width to spare for that column, so the frame drops it and this
 * plugin grows the same choices in one row below the composer's turn, step and
 * token readouts — within thumb reach of the control the user is already
 * touching. Each button opens its surface as a bottom sheet over the
 * conversation; the Settings sheet is owned by the settings surface itself.
 *
 * The glyphs are the sidebar's own primitive icons, so the row reads as the
 * rail the frame dropped rather than as new actions.
 */
import type { ReactNode } from 'react'
import {
  IconClockOutlineRegular, IconNewChatOutlineRegular,
  IconPluginPinwheelOutlineRegular, IconSearchOutlineRegular,
  IconSettingsOutlineRegular, IconWorkspaceTreeOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, SlotInjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import css from './ComposerPanelControls.module.css'

/** What the row's registration injects: one opener per sidebar action. */
export interface ComposerPanelsInjected {
  /** Create a fresh Session, or reuse the current blank one. */
  newSession: () => void
  /** Open the Plugins panel. */
  openPlugins: () => void
  /** Open the Automation-task (schedule) panel. */
  openSchedules: () => void
  /** Present the sidebar's workspace browser. */
  openWorkspaces: () => void
  /** Present the Settings surface. */
  openSettings: () => void
  /** Expand the sidebar with its session search focused. */
  searchSessions: () => void
}

/** The dock-row seat's props: the geometry hook, the openers, and the copy. */
export type ComposerPanelControlsProps =
  & PropsRuntime<'conversation.composer.controls'>
  & SlotInjectFace<ComposerPanelsInjected>
  & PropsLocale<'ui-panel-controls'>

/** One icon-only control in the row, matching the rail's control size. */
function IconButton({ label, target, onClick, children }: {
  /** Accessible name and tooltip. */
  label: string
  /** Stable probe hook naming the surface this button opens. */
  target: string
  /** Opens the target surface. */
  onClick: () => void
  /** The primitive glyph. */
  children: ReactNode
}): ReactNode {
  return (
    <button
      type="button"
      className={css.button}
      aria-label={label}
      title={label}
      data-composer-open={target}
      onClick={onClick}
    >
      <span className={css.glyph} aria-hidden="true">{children}</span>
    </button>
  )
}

/**
 * Render the phone row of frame-navigation controls.
 * @param props - the geometry hook, the six openers, and the localized copy.
 * @returns the icon row, or null while the sidebar rail carries these choices.
 */
export function ComposerPanelControls({
  usePanelGeometry, newSession, openPlugins, openSchedules, openWorkspaces, openSettings, searchSessions, t,
}: ComposerPanelControlsProps): ReactNode {
  // The rail owns these choices whenever it is on screen. The geometry hook is
  // the frame's own solve, so the row appears exactly when the frame has made
  // room for it instead of restating a breakpoint here.
  const shown = usePanelGeometry?.(geometry => geometry.composerOpeners) ?? false
  if (!shown) return null
  return (
    <div className={css.row} data-composer-panel-controls role="toolbar" aria-label={t('bar')}>
      <IconButton label={t('newSession')} target="new-session" onClick={newSession}>
        <IconNewChatOutlineRegular size={16} />
      </IconButton>
      <IconButton label={t('plugins')} target="plugins" onClick={openPlugins}>
        <IconPluginPinwheelOutlineRegular size={16} />
      </IconButton>
      <IconButton label={t('schedules')} target="schedules" onClick={openSchedules}>
        <IconClockOutlineRegular size={16} />
      </IconButton>
      <IconButton label={t('workspaces')} target="workspaces" onClick={openWorkspaces}>
        <IconWorkspaceTreeOutlineRegular size={16} />
      </IconButton>
      <IconButton label={t('settings')} target="settings" onClick={openSettings}>
        <IconSettingsOutlineRegular size={16} />
      </IconButton>
      <IconButton label={t('search')} target="search" onClick={searchSessions}>
        <IconSearchOutlineRegular size={16} />
      </IconButton>
    </div>
  )
}
