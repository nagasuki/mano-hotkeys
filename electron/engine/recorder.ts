import { VK_TO_KEY, MOD_CTRL, MOD_ALT, MOD_SHIFT, MOD_WIN, isMousePseudoVk, printableChar } from './vk.js'
import type { MacroAction } from '../types.js'

/**
 * Captures raw native key/mouse events between start() and stop(), then
 * converts the sequence into a list of MacroActions that the existing
 * action runner can replay.
 *
 * Conversion strategy:
 *   - Group runs of un-modified printable characters into a single
 *     `type-text` action.
 *   - Single non-modifier key down+up (with modifiers) becomes a
 *     `send-keys` action with the accelerator.
 *   - Mouse button down+up becomes `mouse-click` at the captured coords.
 *   - Wheel events become `mouse-scroll` (signed amount).
 *   - Gaps > MIN_SLEEP_MS between actions become explicit `sleep` actions
 *     so timing roughly matches the original recording.
 *
 * Mouse moves are intentionally NOT recorded — replay is brittle on
 * different screen layouts and produces noisy macros. Clicks carry their
 * own absolute coords (move-before-click is synthesized by the click).
 */

export interface RawEvent {
  kind: 'key' | 'mouseButton' | 'wheel'
  vk: number
  mods: number
  up: boolean
  x?: number
  y?: number
  wheelDelta?: number
  t: number // ms since recording start
}

const MIN_SLEEP_MS = 40
const MAX_EVENTS = 2000

export class Recorder {
  private recording = false
  private events: RawEvent[] = []
  private startTime = 0

  isRecording(): boolean {
    return this.recording
  }

  eventCount(): number {
    return this.events.length
  }

  start(): void {
    this.events = []
    this.startTime = Date.now()
    this.recording = true
  }

  /** Hand the recorder a raw native event. Returns true if accepted. */
  push(e: Omit<RawEvent, 't'>): boolean {
    if (!this.recording) return false
    if (this.events.length >= MAX_EVENTS) {
      this.stop()
      return false
    }
    this.events.push({ ...e, t: Date.now() - this.startTime })
    return true
  }

  /** Stop recording and return the converted action list. */
  stop(): MacroAction[] {
    this.recording = false
    const out = convertEvents(this.events)
    this.events = []
    return out
  }

  /** Discard the in-progress recording without producing actions. */
  cancel(): void {
    this.recording = false
    this.events = []
  }
}

function convertEvents(events: RawEvent[]): MacroAction[] {
  const actions: MacroAction[] = []
  let lastT = 0
  let textBuf = ''
  let textStart = 0

  const flushText = () => {
    if (!textBuf) return
    actions.push({ kind: 'type-text', params: { text: textBuf, wpm: 0 }, delayMs: 0 })
    textBuf = ''
    lastT = textStart
  }

  const maybeSleep = (t: number) => {
    const gap = t - lastT
    if (gap >= MIN_SLEEP_MS) {
      actions.push({ kind: 'sleep', params: { ms: gap } })
      lastT = t
    }
  }

  // Pair key-downs with their key-ups so we can emit type-text vs send-keys
  // intelligently. We don't strictly need the up event for replay; we just
  // need to make sure we ignore lonely ups (e.g., user releases a key whose
  // down happened before recording started).
  for (let i = 0; i < events.length; i++) {
    const e = events[i]

    if (e.kind === 'key') {
      if (e.up) continue
      const printable = mayBePrintable(e)
      if (printable !== null) {
        // Accumulate into the typing buffer.
        if (!textBuf) textStart = e.t
        textBuf += printable
        continue
      }
      // Non-printable / modifier-bearing: flush typing buffer, emit send-keys.
      flushText()
      maybeSleep(e.t)
      const accel = accelFromKeyEvent(e)
      if (accel) {
        actions.push({ kind: 'send-keys', params: { keys: accel } })
        lastT = e.t
      }
      continue
    }

    if (e.kind === 'mouseButton') {
      if (e.up) continue
      flushText()
      maybeSleep(e.t)
      const button = mouseButtonNameForClick(e.vk)
      if (!button) continue
      // Coordinates come in as physical pixels. Move-then-click in two
      // actions so the user can edit / disable the move if they want.
      if (typeof e.x === 'number' && typeof e.y === 'number') {
        actions.push({ kind: 'mouse-move', params: { x: e.x, y: e.y, relative: false } })
      }
      actions.push({ kind: 'mouse-click', params: { button, count: 1 } })
      lastT = e.t
      continue
    }

    if (e.kind === 'wheel') {
      flushText()
      maybeSleep(e.t)
      // Native delta is ±120 per notch; collapse to notches with sign.
      const notches = Math.round((e.wheelDelta ?? 0) / 120)
      if (notches !== 0) {
        actions.push({ kind: 'mouse-scroll', params: { amount: notches } })
        lastT = e.t
      }
    }
  }

  flushText()
  return actions
}

function mayBePrintable(e: RawEvent): string | null {
  // Any non-Shift modifier disqualifies typing.
  if (e.mods & (MOD_CTRL | MOD_ALT | MOD_WIN)) return null
  const shift = (e.mods & MOD_SHIFT) !== 0
  return printableChar(e.vk, shift, false)
}

function accelFromKeyEvent(e: RawEvent): string | null {
  const name = VK_TO_KEY[e.vk]
  if (!name) return null
  const parts: string[] = []
  if (e.mods & MOD_CTRL) parts.push('Ctrl')
  if (e.mods & MOD_ALT) parts.push('Alt')
  if (e.mods & MOD_SHIFT) parts.push('Shift')
  if (e.mods & MOD_WIN) parts.push('Win')
  parts.push(name)
  return parts.join('+')
}

function mouseButtonNameForClick(vk: number): 'left' | 'right' | 'middle' | null {
  if (!isMousePseudoVk(vk)) return null
  switch (vk) {
    case 0x201: return 'left'
    case 0x202: return 'right'
    case 0x203: return 'middle'
    default: return null // X1/X2 not in current mouse-click schema
  }
}
