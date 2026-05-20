import { uIOhook, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi'
import type { Hotstring, Macro, Remap, WindowContext } from '../types.js'
import { CODE_TO_KEY, isModifierCode, printableChar } from './keymap.js'
import { eventMatches, parseAccelerator, type ParsedAccelerator } from './matcher.js'
import { HotstringMatcher, type HotstringMatch } from './hotstrings.js'
import { contextAllows } from './context.js'
import { getActiveWindow, getLastActiveWindow, refreshActiveWindow } from './active-window.js'

export interface InputEngineHandlers {
  onMacroTrigger(macro: Macro): void
  onHotstringFire(match: HotstringMatch): void
  onRemapFire(remap: Remap): void
  /** When the suspend accelerator is matched. */
  onSuspendToggle(): void
}

interface CompiledMacro {
  macro: Macro
  accel: ParsedAccelerator
}

interface CompiledRemap {
  remap: Remap
  accel: ParsedAccelerator
}

/**
 * Central input engine — owns the uiohook subscription and routes every
 * keystroke through hotkey, remap, and hotstring matchers.
 *
 * Important caveat: uiohook-napi is a passive listener and cannot suppress
 * the original keystroke. Remaps therefore fire IN ADDITION to the source
 * key reaching the focused app; we emit a warning when registering them.
 */
export class InputEngine {
  private started = false
  private suspended = false
  private capsLock = false

  private macros: CompiledMacro[] = []
  private remaps: CompiledRemap[] = []
  private hotstrings: Hotstring[] = []
  private hotstringBuf = new HotstringMatcher()
  private suspendAccel: ParsedAccelerator | null = null

  private startedAt = 0

  constructor(private handlers: InputEngineHandlers) {}

  start(): void {
    if (this.started) return
    this.started = true
    this.startedAt = Date.now()
    uIOhook.on('keydown', (e) => this.onKeyDown(e))
    uIOhook.start()
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    try {
      uIOhook.stop()
    } catch {
      /* ignore */
    }
  }

  isStarted(): boolean {
    return this.started
  }

  uptimeMs(): number {
    return this.started ? Date.now() - this.startedAt : 0
  }

  setSuspended(v: boolean): void {
    this.suspended = v
    this.hotstringBuf.reset()
  }

  isSuspended(): boolean {
    return this.suspended
  }

  setSuspendAccelerator(accel: string): void {
    this.suspendAccel = parseAccelerator(accel)
  }

  setMacros(macros: Macro[]): string[] {
    const compiled: CompiledMacro[] = []
    const failed: string[] = []
    for (const m of macros) {
      if (!m.enabled) continue
      const accel = m.accelerator?.trim() ? parseAccelerator(m.accelerator) : null
      if (m.accelerator && !accel) {
        failed.push(m.id)
        continue
      }
      if (!accel) continue
      compiled.push({ macro: m, accel })
    }
    this.macros = compiled
    return failed
  }

  setRemaps(remaps: Remap[]): string[] {
    const compiled: CompiledRemap[] = []
    const failed: string[] = []
    for (const r of remaps) {
      if (!r.enabled) continue
      const accel = parseAccelerator(r.from)
      if (!accel) {
        failed.push(r.id)
        continue
      }
      // Remaps only handle single-key sources without modifiers (for now).
      if (accel.modifiers.length > 0) {
        failed.push(r.id)
        continue
      }
      compiled.push({ remap: r, accel })
    }
    this.remaps = compiled
    return failed
  }

  setHotstrings(hotstrings: Hotstring[]): void {
    this.hotstrings = hotstrings.filter((h) => h.enabled)
    this.hotstringBuf.setHotstrings(this.hotstrings)
  }

  private onKeyDown(e: UiohookKeyboardEvent): void {
    // Track CapsLock toggle (best-effort, may drift if user changes it
    // outside our hook before we start).
    if (e.keycode === UiohookKey.CapsLock) this.capsLock = !this.capsLock

    // Pull the latest known active window, kick a refresh in the background.
    refreshActiveWindow()

    // Suspend toggle works even when suspended.
    if (this.suspendAccel && eventMatches(e, this.suspendAccel)) {
      this.handlers.onSuspendToggle()
      return
    }

    if (this.suspended) return

    // Modifier-only key events do nothing.
    if (isModifierCode(e.keycode)) return

    const win = getLastActiveWindow()

    // 1. Try macros (modifier+key combos).
    for (const cm of this.macros) {
      if (!eventMatches(e, cm.accel)) continue
      if (!contextAllows(cm.macro.appContext, win)) continue
      this.handlers.onMacroTrigger(cm.macro)
      // Macros consume the event for hotstring purposes — clear buffer.
      this.hotstringBuf.reset()
      return
    }

    // 2. Try remaps (single-key, no modifiers).
    if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      for (const cr of this.remaps) {
        if (!eventMatches(e, cr.accel)) continue
        this.handlers.onRemapFire(cr.remap)
        return
      }
    }

    // 3. Build hotstring buffer using printable chars (no modifiers besides Shift).
    if (e.ctrlKey || e.altKey || e.metaKey) {
      // Control sequences shouldn't pollute the buffer.
      this.hotstringBuf.reset()
      return
    }
    if (e.keycode === UiohookKey.Backspace) {
      const match = this.hotstringBuf.onChar('\b', this.hotstrings)
      if (match) this.handlers.onHotstringFire(match)
      return
    }
    const ch = printableChar(e.keycode, e.shiftKey, this.capsLock)
    if (ch === null) {
      // Non-printable navigation keys reset the buffer (Enter, Tab handled
      // as terminators below).
      const name = CODE_TO_KEY[e.keycode]
      if (name === 'Enter' || name === 'NumpadEnter' || name === 'Tab') {
        const sep = name === 'Tab' ? '\t' : '\n'
        const match = this.hotstringBuf.onChar(sep, this.hotstrings)
        if (match) {
          this.handlers.onHotstringFire(match)
          // Caller will deal with deletion; clear our buffer.
          this.hotstringBuf.reset()
        }
        return
      }
      this.hotstringBuf.reset()
      return
    }
    const match = this.hotstringBuf.onChar(ch, this.hotstrings)
    if (match) {
      this.handlers.onHotstringFire(match)
      this.hotstringBuf.reset()
    }
  }
}
