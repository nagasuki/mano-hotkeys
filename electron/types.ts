export type ActionKind =
  | 'launch'
  | 'open-url'
  | 'run-command'
  | 'type-text'
  | 'paste-text'
  | 'send-keys'
  | 'notify'

export interface MacroAction {
  kind: ActionKind
  /** Free-form payload — meaning depends on `kind`. */
  value: string
  /** Optional delay before this action runs, in ms. */
  delayMs?: number
}

export interface Macro {
  id: string
  name: string
  /** Electron Accelerator string, e.g. "CommandOrControl+Shift+P". Empty = unbound. */
  accelerator: string
  enabled: boolean
  actions: MacroAction[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  startMinimized: boolean
  launchOnLogin: boolean
  theme: 'dark' | 'light'
}

export interface StoreShape {
  macros: Macro[]
  settings: AppSettings
}

export interface BindResult {
  ok: boolean
  /** When ok=false, which macros failed to bind (id list). */
  failed: string[]
}
