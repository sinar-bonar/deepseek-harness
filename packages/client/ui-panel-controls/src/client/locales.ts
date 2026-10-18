/** Locale namespace owned by this plugin's copy. */
export const NS = 'ui-panel-controls'

/** Chinese copy: the key-set source of truth. */
export const zh = {
  bar: '面板与导航',
  newSession: '新会话',
  plugins: '插件',
  schedules: '自动化任务',
  workspaces: '工作区',
  settings: '设置',
  search: '搜索会话',
}

/** English copy, checked complete against the Chinese key set. */
export const en: Record<keyof typeof zh, string> = {
  bar: 'Panels and navigation',
  newSession: 'New session',
  plugins: 'Plugins',
  schedules: 'Automation tasks',
  workspaces: 'Workspaces',
  settings: 'Settings',
  search: 'Search sessions',
}

/** The copy key union for this namespace. */
export type PanelControlsKey = keyof typeof zh
