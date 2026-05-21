import manoHook from 'mano-hook'
import { KEY_TO_VK, isMousePseudoVk } from '../engine/vk.js'
import { parseAccelerator } from '../engine/matcher.js'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// Windows VK codes for modifiers
const VK = {
  Ctrl: 0x11,
  Alt: 0x12,
  Shift: 0x10,
  Win: 0x5b,
  Backspace: 0x08,
  Enter: 0x0d,
  Tab: 0x09
} as const

const MOD_VK: Record<'Ctrl' | 'Alt' | 'Shift' | 'Win', number> = {
  Ctrl: VK.Ctrl,
  Alt: VK.Alt,
  Shift: VK.Shift,
  Win: VK.Win
}

/**
 * Send a single key combo, e.g. "Ctrl+Shift+T", "Win+D", or "MouseX1".
 * Accepts mouse pseudo-keys as targets so remaps like F13 → MouseMiddle work.
 */
export async function sendKeys(accelerator: string): Promise<void> {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) throw new Error(`Invalid accelerator: ${accelerator}`)
  const vk = KEY_TO_VK[parsed.key]
  if (vk === undefined) throw new Error(`Unknown key: ${parsed.key}`)

  // Hold any keyboard modifiers around the click/tap so combos like
  // "Ctrl+MouseLeft" work as expected.
  const modSteps: { vk: number; down: boolean }[] = parsed.modifiers.map((m) => ({ vk: MOD_VK[m], down: true }))
  if (modSteps.length) manoHook.sendInput(modSteps)

  if (isMousePseudoVk(vk)) {
    // Wheel events are one-shot; buttons get down+up.
    if (vk >= 0x210) {
      manoHook.sendMouseInput([{ kind: 'wheel', vk }])
    } else {
      manoHook.sendMouseInput([
        { kind: 'button', vk, down: true },
        { kind: 'button', vk, down: false }
      ])
    }
  } else {
    manoHook.sendInput([
      { vk, down: true },
      { vk, down: false }
    ])
  }

  if (modSteps.length) {
    manoHook.sendInput(modSteps.map((s) => ({ vk: s.vk, down: false })).reverse())
  }
  await sleep(5)
}

/**
 * Type a literal text string. Each printable character is sent as a
 * VK + optional Shift via SendInput. Unicode fallback for characters
 * outside the US-ASCII keymap is deferred.
 */
export async function typeText(text: string, charDelayMs = 0): Promise<void> {
  for (const ch of text) {
    typeChar(ch)
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

function pressVk(vk: number, withShift: boolean): void {
  const steps: { vk: number; down: boolean }[] = []
  if (withShift) steps.push({ vk: VK.Shift, down: true })
  steps.push({ vk, down: true })
  steps.push({ vk, down: false })
  if (withShift) steps.push({ vk: VK.Shift, down: false })
  manoHook.sendInput(steps)
}

function typeChar(ch: string): void {
  if (ch === '\n') return manoHook.tap(VK.Enter)
  if (ch === '\t') return manoHook.tap(VK.Tab)
  if (ch === '\b') return manoHook.tap(VK.Backspace)

  if (/^[a-z]$/.test(ch)) {
    return pressVk(KEY_TO_VK[ch.toUpperCase()], false)
  }
  if (/^[A-Z]$/.test(ch)) {
    return pressVk(KEY_TO_VK[ch], true)
  }
  if (/^[0-9]$/.test(ch)) {
    return pressVk(KEY_TO_VK[ch], false)
  }
  if (ch in SHIFTED) {
    return pressVk(KEY_TO_VK[SHIFTED[ch]], true)
  }
  if (ch in UNSHIFTED) {
    return pressVk(KEY_TO_VK[UNSHIFTED[ch]], false)
  }
  // Unknown character — Unicode-aware fallback (KEYEVENTF_UNICODE) is TODO.
}

/** Press backspace N times. */
export async function pressBackspace(times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    manoHook.tap(VK.Backspace)
    if (i < times - 1) await sleep(2)
  }
}
