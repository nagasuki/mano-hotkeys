import { UiohookKey } from 'uiohook-napi'

/**
 * Canonical key names used in accelerators. Modifier and non-modifier keys
 * use these exact strings (case-sensitive). Two-way mapping with uiohook
 * keycodes.
 */

export const KEY_TO_CODE: Record<string, number> = {
  // Letters
  ...Object.fromEntries(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => [c, (UiohookKey as any)[c] as number])
  ),
  // Digits — top row
  ...Object.fromEntries(
    '0123456789'.split('').map((c) => [c, (UiohookKey as any)[c] as number])
  ),

  // Function keys F1–F24
  ...Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => [`F${i + 1}`, (UiohookKey as any)[`F${i + 1}`] as number])
  ),

  // Editing / navigation
  Backspace: UiohookKey.Backspace,
  Tab: UiohookKey.Tab,
  Enter: UiohookKey.Enter,
  CapsLock: UiohookKey.CapsLock,
  Esc: UiohookKey.Escape,
  Escape: UiohookKey.Escape,
  Space: UiohookKey.Space,
  PageUp: UiohookKey.PageUp,
  PageDown: UiohookKey.PageDown,
  End: UiohookKey.End,
  Home: UiohookKey.Home,
  Left: UiohookKey.ArrowLeft,
  Up: UiohookKey.ArrowUp,
  Right: UiohookKey.ArrowRight,
  Down: UiohookKey.ArrowDown,
  Insert: UiohookKey.Insert,
  Delete: UiohookKey.Delete,
  PrintScreen: UiohookKey.PrintScreen,
  ScrollLock: UiohookKey.ScrollLock,
  NumLock: UiohookKey.NumLock,

  // Punctuation (US layout — best-effort)
  Semicolon: UiohookKey.Semicolon,
  Equal: UiohookKey.Equal,
  Comma: UiohookKey.Comma,
  Minus: UiohookKey.Minus,
  Period: UiohookKey.Period,
  Slash: UiohookKey.Slash,
  Backquote: UiohookKey.Backquote,
  BracketLeft: UiohookKey.BracketLeft,
  Backslash: UiohookKey.Backslash,
  BracketRight: UiohookKey.BracketRight,
  Quote: UiohookKey.Quote,

  // Numpad
  Numpad0: UiohookKey.Numpad0,
  Numpad1: UiohookKey.Numpad1,
  Numpad2: UiohookKey.Numpad2,
  Numpad3: UiohookKey.Numpad3,
  Numpad4: UiohookKey.Numpad4,
  Numpad5: UiohookKey.Numpad5,
  Numpad6: UiohookKey.Numpad6,
  Numpad7: UiohookKey.Numpad7,
  Numpad8: UiohookKey.Numpad8,
  Numpad9: UiohookKey.Numpad9,
  NumpadAdd: UiohookKey.NumpadAdd,
  NumpadSubtract: UiohookKey.NumpadSubtract,
  NumpadMultiply: UiohookKey.NumpadMultiply,
  NumpadDivide: UiohookKey.NumpadDivide,
  NumpadDecimal: UiohookKey.NumpadDecimal,
  NumpadEnter: UiohookKey.NumpadEnter
}

/** Reverse lookup. */
export const CODE_TO_KEY: Record<number, string> = (() => {
  const out: Record<number, string> = {}
  for (const [name, code] of Object.entries(KEY_TO_CODE)) {
    if (!(code in out)) out[code] = name
  }
  return out
})()

/** Modifier names. */
export const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Win'] as const
export type Modifier = (typeof MODIFIERS)[number]

/** Canonical order for accelerator strings. */
const MOD_ORDER: Record<Modifier, number> = { Ctrl: 0, Alt: 1, Shift: 2, Win: 3 }

export function sortModifiers(mods: Modifier[]): Modifier[] {
  return [...new Set(mods)].sort((a, b) => MOD_ORDER[a] - MOD_ORDER[b])
}

/** Printable characters per key when Shift is or isn't held (US layout). */
const PRINTABLE_LOWER: Record<string, string> = {
  A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f', G: 'g', H: 'h', I: 'i', J: 'j',
  K: 'k', L: 'l', M: 'm', N: 'n', O: 'o', P: 'p', Q: 'q', R: 'r', S: 's', T: 't',
  U: 'u', V: 'v', W: 'w', X: 'x', Y: 'y', Z: 'z',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  Semicolon: ';', Equal: '=', Comma: ',', Minus: '-', Period: '.', Slash: '/',
  Backquote: '`', BracketLeft: '[', Backslash: '\\', BracketRight: ']', Quote: "'",
  Space: ' ',
  Numpad0: '0', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
  Numpad5: '5', Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9',
  NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*', NumpadDivide: '/',
  NumpadDecimal: '.'
}

const PRINTABLE_UPPER: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PRINTABLE_LOWER).map(([k, v]) => [k, v.toUpperCase()])),
  '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
  '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
  Semicolon: ':', Equal: '+', Comma: '<', Minus: '_', Period: '>', Slash: '?',
  Backquote: '~', BracketLeft: '{', Backslash: '|', BracketRight: '}', Quote: '"',
  Space: ' ',
  // Numpad keys don't change with shift
  Numpad0: '0', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
  Numpad5: '5', Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9',
  NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*', NumpadDivide: '/',
  NumpadDecimal: '.'
}

/**
 * Return the printable character produced by a key event, or null if it
 * doesn't produce a printable character (modifiers, function keys, etc.).
 */
export function printableChar(keycode: number, shift: boolean, capsLock: boolean): string | null {
  const name = CODE_TO_KEY[keycode]
  if (!name) return null
  const isLetter = /^[A-Z]$/.test(name)
  // CapsLock affects letters but not symbols.
  const effectiveShift = isLetter ? shift !== capsLock : shift
  const map = effectiveShift ? PRINTABLE_UPPER : PRINTABLE_LOWER
  return map[name] ?? null
}

export function isModifierCode(keycode: number): boolean {
  return (
    keycode === UiohookKey.Ctrl ||
    keycode === UiohookKey.CtrlRight ||
    keycode === UiohookKey.Alt ||
    keycode === UiohookKey.AltRight ||
    keycode === UiohookKey.Shift ||
    keycode === UiohookKey.ShiftRight ||
    keycode === UiohookKey.Meta ||
    keycode === UiohookKey.MetaRight
  )
}
