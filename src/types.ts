// Mirror of electron/types.ts (kept in sync — renderer can't import from main).

export type Accelerator = string

export interface WindowContext {
  title: string
  className: string
  exe: string
}

export interface AppContextRule {
  field: 'title' | 'class' | 'exe'
  op: 'contains' | 'equals' | 'regex'
  value: string
  caseSensitive?: boolean
}

export interface AppContext {
  rules: AppContextRule[]
  negate: boolean
}

export type ActionKind =
  | 'launch'
  | 'open-url'
  | 'run-command'
  | 'type-text'
  | 'paste-text'
  | 'send-keys'
  | 'notify'
  | 'sleep'
  | 'mouse-move'
  | 'mouse-click'
  | 'mouse-scroll'
  | 'window-focus'
  | 'window-close'
  | 'window-minimize'
  | 'clipboard-set'
  | 'clipboard-clear'

export interface MacroAction {
  kind: ActionKind
  params: Record<string, string | number | boolean>
  delayMs?: number
}

export interface Macro {
  id: string
  name: string
  accelerator: Accelerator
  enabled: boolean
  appContext: AppContext
  actions: MacroAction[]
  createdAt: number
  updatedAt: number
}

export interface Hotstring {
  id: string
  trigger: string
  replacement: string
  caseSensitive: boolean
  immediate: boolean
  resetOnBackspace: boolean
  enabled: boolean
  appContext: AppContext
  createdAt: number
  updatedAt: number
}

export interface Remap {
  id: string
  from: string
  to: Accelerator
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  startMinimized: boolean
  launchOnLogin: boolean
  theme: 'dark' | 'light'
  suspendAccelerator: Accelerator
  suspended: boolean
}

export interface BindResult {
  ok: boolean
  failed: string[]
}

export interface EngineStatus {
  hookActive: boolean
  suspended: boolean
  hotkeyCount: number
  hotstringCount: number
  remapCount: number
  uptimeMs: number
}

export interface RecorderStatus {
  recording: boolean
  eventCount: number
}

export interface ApiBridge {
  listMacros(): Promise<Macro[]>
  saveMacros(m: Macro[]): Promise<BindResult>
  testActions(actions: MacroAction[]): Promise<void>

  listHotstrings(): Promise<Hotstring[]>
  saveHotstrings(h: Hotstring[]): Promise<BindResult>

  listRemaps(): Promise<Remap[]>
  saveRemaps(r: Remap[]): Promise<BindResult>

  getSettings(): Promise<AppSettings>
  saveSettings(s: AppSettings): Promise<AppSettings>

  engineStatus(): Promise<EngineStatus>
  setSuspended(v: boolean): Promise<AppSettings>
  getActiveWindow(): Promise<WindowContext>

  quit(): Promise<void>
  minimizeToTray(): Promise<void>

  onEngineUpdate(cb: (status: EngineStatus) => void): () => void

  recorderStart(): Promise<RecorderStatus>
  recorderStop(): Promise<MacroAction[]>
  recorderCancel(): Promise<void>
  recorderStatus(): Promise<RecorderStatus>
  onRecorderUpdate(cb: (status: RecorderStatus) => void): () => void
}

declare global {
  interface Window {
    api: ApiBridge
  }
}

// ── Action UI catalog ───────────────────────────────────────────────────────

export const ACTION_LABELS: Record<ActionKind, string> = {
  launch: 'Launch app or open file',
  'open-url': 'Open URL',
  'run-command': 'Run shell command',
  'type-text': 'Type text',
  'paste-text': 'Paste text',
  'send-keys': 'Send keys (raw)',
  notify: 'Show notification',
  sleep: 'Wait',
  'mouse-move': 'Move mouse',
  'mouse-click': 'Mouse click',
  'mouse-scroll': 'Mouse scroll',
  'window-focus': 'Focus window',
  'window-close': 'Close window',
  'window-minimize': 'Minimize window',
  'clipboard-set': 'Set clipboard',
  'clipboard-clear': 'Clear clipboard'
}

export const ACTION_CATEGORIES: { label: string; kinds: ActionKind[] }[] = [
  { label: 'Apps & files', kinds: ['launch', 'open-url', 'run-command'] },
  { label: 'Keyboard', kinds: ['type-text', 'paste-text', 'send-keys'] },
  { label: 'Mouse', kinds: ['mouse-move', 'mouse-click', 'mouse-scroll'] },
  { label: 'Windows', kinds: ['window-focus', 'window-close', 'window-minimize'] },
  { label: 'Clipboard', kinds: ['clipboard-set', 'clipboard-clear'] },
  { label: 'Flow', kinds: ['sleep', 'notify'] }
]

export interface ActionParam {
  name: string
  label: string
  kind: 'text' | 'multiline' | 'number' | 'select' | 'checkbox'
  placeholder?: string
  options?: { value: string; label: string }[]
  default?: string | number | boolean
}

export const ACTION_SCHEMA: Record<ActionKind, ActionParam[]> = {
  launch: [
    { name: 'target', label: 'Path or command', kind: 'text', placeholder: 'C:\\Program Files\\Notepad++\\notepad++.exe' }
  ],
  'open-url': [
    { name: 'url', label: 'URL', kind: 'text', placeholder: 'https://example.com' }
  ],
  'run-command': [
    { name: 'command', label: 'Shell command', kind: 'multiline', placeholder: 'powershell -Command "Get-Date"' }
  ],
  'type-text': [
    { name: 'text', label: 'Text to type', kind: 'multiline', placeholder: 'Hello, world!' },
    { name: 'wpm', label: 'Speed (chars / 100ms)', kind: 'number', default: 0, placeholder: '0 = instant' }
  ],
  'paste-text': [
    { name: 'text', label: 'Text to paste', kind: 'multiline', placeholder: 'Long block of text…' }
  ],
  'send-keys': [
    { name: 'keys', label: 'Accelerator', kind: 'text', placeholder: 'Ctrl+Shift+T   or   Win+D' }
  ],
  notify: [
    { name: 'title', label: 'Title', kind: 'text', default: 'Mano Hotkeys', placeholder: 'Reminder' },
    { name: 'body', label: 'Body', kind: 'multiline', placeholder: 'Macro fired.' }
  ],
  sleep: [{ name: 'ms', label: 'Milliseconds', kind: 'number', default: 250 }],
  'mouse-move': [
    { name: 'x', label: 'X', kind: 'number', default: 0 },
    { name: 'y', label: 'Y', kind: 'number', default: 0 },
    { name: 'relative', label: 'Relative to current position', kind: 'checkbox', default: false }
  ],
  'mouse-click': [
    {
      name: 'button',
      label: 'Button',
      kind: 'select',
      default: 'left',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'middle', label: 'Middle' }
      ]
    },
    { name: 'count', label: 'Clicks', kind: 'number', default: 1 }
  ],
  'mouse-scroll': [
    { name: 'amount', label: 'Amount (positive = up)', kind: 'number', default: 3 }
  ],
  'window-focus': [
    { name: 'titleContains', label: 'Window title contains', kind: 'text', placeholder: 'Notepad' }
  ],
  'window-close': [
    { name: 'titleContains', label: 'Window title contains', kind: 'text', placeholder: '' }
  ],
  'window-minimize': [
    { name: 'titleContains', label: 'Window title contains (blank = active)', kind: 'text', placeholder: '' }
  ],
  'clipboard-set': [{ name: 'text', label: 'Text', kind: 'multiline', placeholder: '' }],
  'clipboard-clear': []
}

export function emptyAppContext(): AppContext {
  return { rules: [], negate: false }
}

export function defaultParams(kind: ActionKind): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const p of ACTION_SCHEMA[kind]) {
    if (p.default !== undefined) out[p.name] = p.default
    else if (p.kind === 'number') out[p.name] = 0
    else if (p.kind === 'checkbox') out[p.name] = false
    else if (p.kind === 'select' && p.options && p.options[0]) out[p.name] = p.options[0].value
    else out[p.name] = ''
  }
  return out
}
