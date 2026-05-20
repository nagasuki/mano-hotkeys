import { CODE_TO_KEY, KEY_TO_CODE, MODIFIERS, sortModifiers, type Modifier } from './keymap.js'

export interface ParsedAccelerator {
  modifiers: Modifier[]
  key: string
}

/**
 * Parse "Ctrl+Shift+P" → { modifiers: ['Ctrl','Shift'], key: 'P' }.
 * Returns null when the string is malformed or has no non-modifier key.
 */
export function parseAccelerator(raw: string): ParsedAccelerator | null {
  if (!raw) return null
  const tokens = raw
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return null

  const mods: Modifier[] = []
  let key: string | null = null

  for (const tok of tokens) {
    const norm = normalizeToken(tok)
    if (!norm) return null
    if ((MODIFIERS as readonly string[]).includes(norm)) {
      mods.push(norm as Modifier)
    } else {
      if (key) return null // two non-modifier keys
      key = norm
    }
  }
  if (!key) return null
  return { modifiers: sortModifiers(mods), key }
}

function normalizeToken(tok: string): string | null {
  const lower = tok.toLowerCase()
  // Modifier aliases
  if (lower === 'ctrl' || lower === 'control' || lower === 'cmdorctrl' || lower === 'commandorcontrol') return 'Ctrl'
  if (lower === 'alt' || lower === 'option') return 'Alt'
  if (lower === 'shift') return 'Shift'
  if (lower === 'win' || lower === 'super' || lower === 'meta' || lower === 'cmd' || lower === 'command') return 'Win'

  // Key aliases
  if (lower === 'esc' || lower === 'escape') return 'Esc'
  if (lower === 'return') return 'Enter'
  if (lower === 'pgup') return 'PageUp'
  if (lower === 'pgdn') return 'PageDown'
  if (lower === 'del') return 'Delete'
  if (lower === 'ins') return 'Insert'

  // Single character letters/digits — upper-case letters, digits as-is
  if (/^[a-z]$/.test(lower)) return lower.toUpperCase()
  if (/^[0-9]$/.test(lower)) return lower

  // Function keys
  if (/^f([1-9]|1[0-9]|2[0-4])$/.test(lower)) return 'F' + lower.slice(1)

  // Punctuation by canonical name
  if (lower in KEY_TO_CODE_LC) return KEY_TO_CODE_LC[lower]
  return null
}

const KEY_TO_CODE_LC: Record<string, string> = Object.fromEntries(
  Object.keys(KEY_TO_CODE).map((k) => [k.toLowerCase(), k])
)

export function formatAccelerator(p: ParsedAccelerator): string {
  return [...p.modifiers, p.key].join('+')
}

/**
 * Match a current event (keycode + modifier flags) against a parsed accel.
 * Modifier match is exact: extra modifiers held = no match.
 */
export interface KeyEventLike {
  keycode: number
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

export function eventMatches(event: KeyEventLike, parsed: ParsedAccelerator): boolean {
  const name = CODE_TO_KEY[event.keycode]
  if (!name) return false
  if (name !== parsed.key) return false
  const wantCtrl = parsed.modifiers.includes('Ctrl')
  const wantAlt = parsed.modifiers.includes('Alt')
  const wantShift = parsed.modifiers.includes('Shift')
  const wantWin = parsed.modifiers.includes('Win')
  return (
    event.ctrlKey === wantCtrl &&
    event.altKey === wantAlt &&
    event.shiftKey === wantShift &&
    event.metaKey === wantWin
  )
}

/** Validate accelerator string — used by the UI to flag bad bindings. */
export function isValidAccelerator(raw: string): boolean {
  return parseAccelerator(raw) !== null
}
