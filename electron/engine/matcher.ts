import { KEY_TO_VK, MODIFIERS, VK_TO_KEY, sortModifiers, type Modifier } from './vk.js'

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
  if (lower === 'ctrl' || lower === 'control' || lower === 'cmdorctrl' || lower === 'commandorcontrol') return 'Ctrl'
  if (lower === 'alt' || lower === 'option') return 'Alt'
  if (lower === 'shift') return 'Shift'
  if (lower === 'win' || lower === 'super' || lower === 'meta' || lower === 'cmd' || lower === 'command') return 'Win'

  // Mouse aliases (AHK-style + verbose forms)
  if (lower === 'lbutton' || lower === 'mouseleft' || lower === 'mouse1') return 'MouseLeft'
  if (lower === 'rbutton' || lower === 'mouseright' || lower === 'mouse2') return 'MouseRight'
  if (lower === 'mbutton' || lower === 'mousemiddle' || lower === 'mouse3') return 'MouseMiddle'
  if (lower === 'xbutton1' || lower === 'mousex1' || lower === 'mouse4') return 'MouseX1'
  if (lower === 'xbutton2' || lower === 'mousex2' || lower === 'mouse5') return 'MouseX2'
  if (lower === 'wheelup') return 'WheelUp'
  if (lower === 'wheeldown') return 'WheelDown'
  if (lower === 'wheelleft') return 'WheelLeft'
  if (lower === 'wheelright') return 'WheelRight'

  if (lower === 'esc' || lower === 'escape') return 'Esc'
  if (lower === 'return') return 'Enter'
  if (lower === 'pgup') return 'PageUp'
  if (lower === 'pgdn') return 'PageDown'
  if (lower === 'del') return 'Delete'
  if (lower === 'ins') return 'Insert'

  if (/^[a-z]$/.test(lower)) return lower.toUpperCase()
  if (/^[0-9]$/.test(lower)) return lower
  if (/^f([1-9]|1[0-9]|2[0-4])$/.test(lower)) return 'F' + lower.slice(1)

  if (lower in KEY_TO_VK_LC) return KEY_TO_VK_LC[lower]
  return null
}

const KEY_TO_VK_LC: Record<string, string> = Object.fromEntries(
  Object.keys(KEY_TO_VK).map((k) => [k.toLowerCase(), k])
)

export function formatAccelerator(p: ParsedAccelerator): string {
  return [...p.modifiers, p.key].join('+')
}

/**
 * Match an event (VK + modifier mask) against a parsed accelerator.
 * Modifier match is exact: extra modifiers held = no match.
 */
export interface KeyEventLike {
  vk: number
  mods: number // bitmask, see vk.ts
}

export function eventMatches(event: KeyEventLike, parsed: ParsedAccelerator): boolean {
  const name = VK_TO_KEY[event.vk]
  if (!name) return false
  if (name !== parsed.key) return false
  // Modifier mask must match exactly
  const want =
    (parsed.modifiers.includes('Ctrl')  ? 1 : 0) |
    (parsed.modifiers.includes('Alt')   ? 2 : 0) |
    (parsed.modifiers.includes('Shift') ? 4 : 0) |
    (parsed.modifiers.includes('Win')   ? 8 : 0)
  return event.mods === want
}

export function isValidAccelerator(raw: string): boolean {
  return parseAccelerator(raw) !== null
}
