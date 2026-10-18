# @deepseek-ai/dsh-client-ui-panel-controls

A local plugin for the Web GUI: on a phone-width frame it puts the sidebar's
actions in one icon row below the composer's turn/step/token readouts, so every
surface the rail carries stays reachable after the frame drops that rail.

Not published, not upstreamed — this is a local customization of a workspace
checkout.

## What it does

Below `PANEL_SHEET_MAX` (640px) the frame drops the sidebar rail to give the
conversation the full viewport width. The rail is where New Session, the panel
entries, Workspaces, Settings, and session search lived, so those actions move
here: one row inside the composer dock, below the status readouts and within
thumb reach of the control the user is already touching.

The row is icon-only and reuses the same `@deepseek-ai/dsh-client-ui-primitives`
glyphs the rail uses, so it reads as the dropped rail rather than as new
actions:

- **New session** starts a fresh Session through `ctx.uiWorkspace`.
- **Plugins** and **Automation tasks** select their main panel. On a phone the
  selected panel renders as a bottom sheet over the conversation; dismissing
  the sheet (tap the scrim) returns to the conversation.
- **Workspaces** and **Search sessions** present the sidebar as a bottom sheet.
  Search is entered through the sidebar region's own shortcut-bound control, so
  the sheet opens with the search field focused.
- **Settings** opens the Settings surface, which has its own phone sheet.

Above the breakpoint the rail is on screen and the row renders nothing, so
desktop behaviour is unchanged.

## How it is wired

- `ui-layout` publishes a `PanelGeometry` observable (`viewportWidth`,
  `sidebarExpanded`, `composerOpeners`, `narrowPanels`) through
  `ctx.layout.panelGeometry` and `slots.provideRoot`. The renderer binds it as
  the `usePanelGeometry` hook for every seat below the root, so this plugin
  reads the frame's own state instead of creating a second layout store (which
  would seed itself from `window.innerWidth` and drift).
- The seat is `conversation.composer.controls`, declared by `ui-conversation`
  and rendered in the composer dock after the status rows. It renders on every
  composer variant, so the row exists on the landing surface as well.
- Selecting a main panel on a phone closes any open sidebar sheet first, so the
  panel sheet is never hidden behind the drawer.
- Settings is presented through the `settingsPanel` client service rather than
  a slot: its surface is body-portalled and mounts once.

It is a package of its own rather than part of `ui-layout` because the composer
dock belongs to `ui-conversation`, which already references `ui-layout`;
registering from `ui-layout` would close a project-reference cycle.

## Build

The served client bundle is `lib/client.js`, not the sources. After editing:

```sh
node <runtime>/node.exe <runtime>/pnpm.mjs exec tsdown --config packages/client/ui-panel-controls/tsdown.config.ts
```

Then reload the page. `dev:web` rebuilds on edit; a plain `dsh web` serves the
installed `app.asar` and will not show these changes.
