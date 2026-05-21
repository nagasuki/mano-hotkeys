/**
 * Canonical key name ↔ Windows virtual-key code mapping.
 * These are the codes the low-level hook reports and that SendInput accepts.
 *
 * Replaces the previous uiohook-based keymap. Canonical names are the same
 * (so accelerators saved by older builds keep parsing) but the underlying
 * codes are now Windows VKs.
 */

export const MOD_CTRL = 1 << 0
export const MOD_ALT = 1 << 1
export const MOD_SHIFT = 1 << 2
export const MOD_WIN = 1 << 3

// Mouse pseudo-VKs (outside the 8-bit Windows VK space). Kept in the same
// KEY_TO_VK table so the accelerator parser and matcher treat "MouseX1" the
// same as "F13".
export const MVK_LEFT = 0x201
export const MVK_RIGHT = 0x202
export const MVK_MIDDLE = 0x203
export const MVK_X1 = 0x204
export const MVK_X2 = 0x205
export const MVK_WHEEL_UP = 0x210
export const MVK_WHEEL_DOWN = 0x211
export const MVK_WHEEL_LEFT = 0x212
export const MVK_WHEEL_RIGHT = 0x213

export function isMousePseudoVk(vk: number): boolean {
  return vk >= 0x200
}

export const KEY_TO_VK: Record<string, number> = {
  // Letters (VK 0x41..0x5A == 'A'..'Z')
  ...Object.fromEntries(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => [c, c.charCodeAt(0)])
  ),
  // Digits (top row, VK 0x30..0x39)
  ...Object.fromEntries('0123456789'.split('').map((c) => [c, c.charCodeAt(0)])),

  // F-keys (VK_F1=0x70 ... VK_F24=0x87)
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`F${i + 1}`, 0x70 + i])),

  Backspace: 0x08,
  Tab: 0x09,
  Enter: 0x0d,
  CapsLock: 0x14,
  Esc: 0x1b,
  Escape: 0x1b,
  Space: 0x20,
  PageUp: 0x21,
  PageDown: 0x22,
  End: 0x23,
  Home: 0x24,
  Left: 0x25,
  Up: 0x26,
  Right: 0x27,
  Down: 0x28,
  Insert: 0x2d,
  Delete: 0x2e,
  PrintScreen: 0x2c,
  ScrollLock: 0x91,
  NumLock: 0x90,
  Pause: 0x13,

  // Punctuation (US layout VK_OEM_*)
  Semicolon: 0xba,    // ;:
  Equal: 0xbb,        // =+
  Comma: 0xbc,        // ,<
  Minus: 0xbd,        // -_
  Period: 0xbe,       // .>
  Slash: 0xbf,        // /?
  Backquote: 0xc0,    // `~
  BracketLeft: 0xdb,  // [{
  Backslash: 0xdc,    // \|
  BracketRight: 0xdd, // ]}
  Quote: 0xde,        // '"

  // Numpad
  Numpad0: 0x60, Numpad1: 0x61, Numpad2: 0x62, Numpad3: 0x63, Numpad4: 0x64,
  Numpad5: 0x65, Numpad6: 0x66, Numpad7: 0x67, Numpad8: 0x68, Numpad9: 0x69,
  NumpadMultiply: 0x6a,
  NumpadAdd: 0x6b,
  NumpadSubtract: 0x6d,
  NumpadDecimal: 0x6e,
  NumpadDivide: 0x6f,
  NumpadEnter: 0x0d, // VK_RETURN, distinguished only via extended flag

  // Mouse pseudo-keys
  MouseLeft: MVK_LEFT,
  MouseRight: MVK_RIGHT,
  MouseMiddle: MVK_MIDDLE,
  MouseX1: MVK_X1,
  MouseX2: MVK_X2,
  WheelUp: MVK_WHEEL_UP,
  WheelDown: MVK_WHEEL_DOWN,
  WheelLeft: MVK_WHEEL_LEFT,
  WheelRight: MVK_WHEEL_RIGHT
}

export const VK_TO_KEY: Record<number, string> = (() => {
  const out: Record<number, string> = {}
  for (const [name, vk] of Object.entries(KEY_TO_VK)) {
    if (!(vk in out)) out[vk] = name
  }
  return out
})()

// Modifier VKs we treat as "the modifier" for ruleset purposes.
export const MOD_VKS = new Set<number>([
  0x10, 0xa0, 0xa1, // Shift / LShift / RShift
  0x11, 0xa2, 0xa3, // Ctrl  / LCtrl  / RCtrl
  0x12, 0xa4, 0xa5, // Alt   / LAlt   / RAlt
  0x5b, 0x5c        // LWin / RWin
])

export const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Win'] as const
export type Modifier = (typeof MODIFIERS)[number]

const MOD_ORDER: Record<Modifier, number> = { Ctrl: 0, Alt: 1, Shift: 2, Win: 3 }
export function sortModifiers(mods: Modifier[]): Modifier[] {
  return [...new Set(mods)].sort((a, b) => MOD_ORDER[a] - MOD_ORDER[b])
}

export function modMaskFromList(mods: Modifier[]): number {
  let m = 0
  for (const x of mods) {
    if (x === 'Ctrl') m |= MOD_CTRL
    else if (x === 'Alt') m |= MOD_ALT
    else if (x === 'Shift') m |= MOD_SHIFT
    else if (x === 'Win') m |= MOD_WIN
  }
  return m
}

/** Printable character produced by a VK at given shift/capslock state, US layout. */
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
  Numpad0: '0', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
  Numpad5: '5', Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9',
  NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*', NumpadDivide: '/',
  NumpadDecimal: '.'
}

export function printableChar(vk: number, shift: boolean, capsLock: boolean): string | null {
  const name = VK_TO_KEY[vk]
  if (!name) return null
  const isLetter = /^[A-Z]$/.test(name)
  const effectiveShift = isLetter ? shift !== capsLock : shift
  const map = effectiveShift ? PRINTABLE_UPPER : PRINTABLE_LOWER
  return map[name] ?? null
}

export function isModifierVk(vk: number): boolean {
  return MOD_VKS.has(vk)
}
