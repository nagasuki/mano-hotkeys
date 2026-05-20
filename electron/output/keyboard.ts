import { uIOhook, UiohookKey } from 'uiohook-napi'
import { KEY_TO_CODE } from '../engine/keymap.js'
import { parseAccelerator } from '../engine/matcher.js'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const MODIFIER_CODES = {
  Ctrl: UiohookKey.Ctrl,
  Alt: UiohookKey.Alt,
  Shift: UiohookKey.Shift,
  Win: UiohookKey.Meta
} as const

/** Send a single key combo, e.g. "Ctrl+Shift+T" or "Win+D". */
export async function sendKeys(accelerator: string): Promise<void> {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) throw new Error(`Invalid accelerator: ${accelerator}`)
  const keyCode = KEY_TO_CODE[parsed.key]
  if (keyCode === undefined) throw new Error(`Unknown key: ${parsed.key}`)

  const modCodes = parsed.modifiers.map((m) => MODIFIER_CODES[m])
  for (const c of modCodes) uIOhook.keyToggle(c, 'down')
  // Small delay so modifier-down registers before the key.
  await sleep(5)
  uIOhook.keyTap(keyCode)
  await sleep(5)
  for (const c of [...modCodes].reverse()) uIOhook.keyToggle(c, 'up')
}

/**
 * Type a literal text string. For each printable character, find the
 * keycode and shift state and tap it. Falls back to "Backspace" / "Enter"
 * for control characters.
 */
export async function typeText(text: string, charDelayMs = 0): Promise<void> {
  for (const ch of text) {
    await typeChar(ch)
    if (charDelayMs > 0) await sleep(charDelayMs)
  }
}

const SHIFTED: Record<string, string> = {
  '!': '1', '@': '2', '#': '3', $: '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  _: 'Minus', '+': 'Equal', '{': 'BracketLeft', '}': 'BracketRight',
  '|': 'Backslash', ':': 'Semicolon', '"': 'Quote',
  '<': 'Comma', '>': 'Period', '?': 'Slash', '~': 'Backquote'
}

const UNSHIFTED: Record<string, string> = {
  ' ': 'Space',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '`': 'Backquote'
}

async function typeChar(ch: string): Promise<void> {
  if (ch === '\n') {
    uIOhook.keyTap(UiohookKey.Enter)
    return
  }
  if (ch === '\t') {
    uIOhook.keyTap(UiohookKey.Tab)
    return
  }
  if (ch === '\b') {
    uIOhook.keyTap(UiohookKey.Backspace)
    return
  }

  // Letters
  if (/^[a-z]$/.test(ch)) {
    uIOhook.keyTap(KEY_TO_CODE[ch.toUpperCase()])
    return
  }
  if (/^[A-Z]$/.test(ch)) {
    uIOhook.keyToggle(UiohookKey.Shift, 'down')
    uIOhook.keyTap(KEY_TO_CODE[ch])
    uIOhook.keyToggle(UiohookKey.Shift, 'up')
    return
  }
  // Digits
  if (/^[0-9]$/.test(ch)) {
    uIOhook.keyTap(KEY_TO_CODE[ch])
    return
  }
  // Shifted symbols
  if (ch in SHIFTED) {
    const keyName = SHIFTED[ch]
    const code = /^[0-9]$/.test(keyName) ? KEY_TO_CODE[keyName] : KEY_TO_CODE[keyName]
    uIOhook.keyToggle(UiohookKey.Shift, 'down')
    uIOhook.keyTap(code)
    uIOhook.keyToggle(UiohookKey.Shift, 'up')
    return
  }
  if (ch in UNSHIFTED) {
    uIOhook.keyTap(KEY_TO_CODE[UNSHIFTED[ch]])
    return
  }
  // Unknown character — give up silently (could be unicode).
}

/** Press backspace N times. */
export async function pressBackspace(times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    uIOhook.keyTap(UiohookKey.Backspace)
    await sleep(2)
  }
}
