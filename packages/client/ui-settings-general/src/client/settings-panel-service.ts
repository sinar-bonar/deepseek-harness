/**
 * Client service allowing another plugin to present the Settings surface
 * without occupying `sidebar.settings` or forging the `settings.open` shortcut.
 *
 * The Settings shell is mounted once, by ui-settings-general, wherever the
 * sidebar renders it; the surface it opens is a body-portaled layer, so a
 * caller elsewhere in the frame reaches it through this service rather than by
 * rendering the shell a second time.
 */

/** Presents the Settings surface. */
export interface SettingsPanelService {
  /**
   * Open Settings, optionally on a specific section.
   * @param sectionId - section to activate; the shell keeps its current or first
   *   section when omitted, and falls back to the first row when the id is gone.
   */
  open(sectionId?: string): void
  /** Close Settings if it is open; a no-op otherwise. */
  close(): void
}
