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
  value: string
  delayMs?: number
}

export interface Macro {
  id: string
  name: string
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

export interface BindResult {
  ok: boolean
  failed: string[]
}

export interface ApiBridge {
  listMacros(): Promise<Macro[]>
  saveMacros(macros: Macro[]): Promise<BindResult>
  testActions(actions: MacroAction[]): Promise<void>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<AppSettings>
  quit(): Promise<void>
  minimizeToTray(): Promise<void>
}

declare global {
  interface Window {
    api: ApiBridge
  }
}

export const ACTION_LABELS: Record<ActionKind, string> = {
  launch: 'Launch app / open file',
  'open-url': 'Open URL',
  'run-command': 'Run shell command',
  'type-text': 'Type text',
  'paste-text': 'Paste text',
  'send-keys': 'Send keys (SendKeys syntax)',
  notify: 'Show notification'
}

export const ACTION_PLACEHOLDERS: Record<ActionKind, string> = {
  launch: 'C:\\Path\\To\\App.exe   or   C:\\file.txt',
  'open-url': 'https://example.com',
  'run-command': 'powershell -c "Get-Date"',
  'type-text': 'Hello, world!',
  'paste-text': 'Long block of text to paste…',
  'send-keys': '^c   or   %{F4}   or   {ENTER}',
  notify: 'Reminder: stand up'
}
