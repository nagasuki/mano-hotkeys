/**
 * Shared types between main, preload, and renderer. Anything that crosses
 * the IPC boundary lives here.
 */

// ── Hotkey accelerator ──────────────────────────────────────────────────────

/**
 * Internal accelerator string. Examples: "Ctrl+Shift+P", "Win+Space",
 * "Ctrl+Alt+F12", "Win+Enter". Modifier order is canonical:
 * Ctrl → Alt → Shift → Win, then the non-modifier key.
 */
export type Accelerator = string

// ── Window context ──────────────────────────────────────────────────────────

export interface WindowContext {
  title: string
  className: string
  exe: string
}

/** Conditions that gate when a macro is allowed to fire. */
export interface AppContext {
  /** Empty array = always fire. Each rule is OR'd; macro fires if any rule matches. */
  rules: AppContextRule[]
  /** When true, the rules are NEGATED — macro fires when none match. */
  negate: boolean
}

export interface AppContextRule {
  field: 'title' | 'class' | 'exe'
  /** Match operator. */
  op: 'contains' | 'equals' | 'regex'
  value: string
  caseSensitive?: boolean
}

// ── Macros ──────────────────────────────────────────────────────────────────

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
  /** Action-specific payload, see ACTION_SCHEMA for shape per kind. */
  params: Record<string, string | number | boolean>
  /** Optional delay before this action runs, in ms. */
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

// ── Hotstrings ──────────────────────────────────────────────────────────────

export interface Hotstring {
  id: string
  /** Trigger text, e.g. "btw". */
  trigger: string
  /** Replacement text. */
  replacement: string
  /** Match case (otherwise case-insensitive). */
  caseSensitive: boolean
  /** Trigger on terminator char (default) vs. fire immediately on last char. */
  immediate: boolean
  /** Resets the buffer when the user types backspace. */
  resetOnBackspace: boolean
  enabled: boolean
  appContext: AppContext
  createdAt: number
  updatedAt: number
}

// ── Remaps ──────────────────────────────────────────────────────────────────

export interface Remap {
  id: string
  /** Source key (single key without modifiers, e.g. "CapsLock"). */
  from: string
  /** Target output sent when the source key is pressed. */
  to: Accelerator
  enabled: boolean
  /** NOTE: native suppression of the original key requires a low-level hook
   *  with interception. Without that, the source key may still reach the
   *  focused app. We mark unsupported remaps in the UI. */
  createdAt: number
  updatedAt: number
}

// ── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  startMinimized: boolean
  launchOnLogin: boolean
  theme: 'dark' | 'light'
  /** Accelerator that toggles global suspend. Empty = no shortcut. */
  suspendAccelerator: Accelerator
  suspended: boolean
}

// ── Store + IPC ─────────────────────────────────────────────────────────────

export interface StoreShape {
  macros: Macro[]
  hotstrings: Hotstring[]
  remaps: Remap[]
  settings: AppSettings
}

export interface BindResult {
  ok: boolean
  /** When ok=false, which entry ids failed to bind. */
  failed: string[]
}

export interface EngineStatus {
  hookActive: boolean
  suspended: boolean
  hotkeyCount: number
  hotstringCount: number
  remapCount: number
  /** ms since the engine started. */
  uptimeMs: number
}

// ── UI catalog (kept here so renderer + main share one source of truth) ─────

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

export interface ActionParam {
  name: string
  label: string
  kind: 'text' | 'multiline' | 'number' | 'select' | 'checkbox'
  placeholder?: string
  options?: { value: string; label: string }[]
  default?: string | number | boolean
}

/** Per-action schema: what params each action exposes in the UI. */
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
    { name: 'wpm', label: 'Typing speed (chars / 100ms)', kind: 'number', default: 0, placeholder: '0 = instant' }
  ],
  'paste-text': [
    { name: 'text', label: 'Text to paste', kind: 'multiline', placeholder: 'Long block of text…' }
  ],
  'send-keys': [
    { name: 'keys', label: 'Key sequence', kind: 'text', placeholder: 'Ctrl+Shift+T   or   Win+D' }
  ],
  notify: [
    { name: 'title', label: 'Title', kind: 'text', default: 'Mano Hotkeys', placeholder: 'Reminder' },
    { name: 'body', label: 'Body', kind: 'multiline', placeholder: 'Macro fired.' }
  ],
  sleep: [
    { name: 'ms', label: 'Milliseconds', kind: 'number', default: 250 }
  ],
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
  'clipboard-set': [
    { name: 'text', label: 'Text', kind: 'multiline', placeholder: '' }
  ],
  'clipboard-clear': []
}

export function emptyAppContext(): AppContext {
  return { rules: [], negate: false }
}
