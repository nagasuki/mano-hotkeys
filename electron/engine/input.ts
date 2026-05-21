import manoHook from 'mano-hook'
import type { Hotstring, Macro, Remap } from '../types.js'
import {
  KEY_TO_VK,
  VK_TO_KEY,
  MOD_CTRL,
  MOD_ALT,
  MOD_SHIFT,
  MOD_WIN,
  isModifierVk,
  modMaskFromList,
  printableChar
} from './vk.js'
import { parseAccelerator, type ParsedAccelerator } from './matcher.js'
import { HotstringMatcher, type HotstringMatch } from './hotstrings.js'
import { contextAllows } from './context.js'
import { getLastActiveWindow, refreshActiveWindow } from './active-window.js'

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
  vk: number
  mods: number
  ruleId: string
}

interface CompiledRemap {
  remap: Remap
  vk: number
  ruleId: string
}

interface NativeKeyEvent {
  kind: 'key' | 'mouseButton' | 'wheel'
  vk: number
  mods: number
  up: boolean
  suppressed: boolean
  x?: number
  y?: number
  wheelDelta?: number
  ruleId?: string
}

/**
 * Central input engine — owns the native low-level hook subscription and
 * routes every keystroke through hotkey, remap, and hotstring matchers.
 *
 * Hotkey and remap matches are suppressed at the OS level (decided
 * synchronously by the native ruleset). Hotstrings run unsuppressed and
 * clean up via BackSpace, same as AHK.
 */
export class InputEngine {
  private started = false
  private suspended = false
  private capsLock = false

  private macros: CompiledMacro[] = []
  private remaps: CompiledRemap[] = []
  private macroById = new Map<string, CompiledMacro>()
  private remapById = new Map<string, CompiledRemap>()
  private hotstrings: Hotstring[] = []
  private hotstringBuf = new HotstringMatcher()
  private suspendAccel: ParsedAccelerator | null = null
  private readonly suspendRuleId = '__suspend__'

  private rawHandler: ((e: NativeKeyEvent) => boolean) | null = null

  private startedAt = 0

  constructor(private handlers: InputEngineHandlers) {}

  /**
   * Install a raw-event handler (used by the recorder). When set, native
   * rules are bypassed (we push an empty ruleset, keeping only the suspend
   * binding) and every key/mouse event is forwarded to `cb`. The handler
   * returns true if it consumed the event; that's currently informational
   * only since the native side has already decided suppression.
   */
  setRawHandler(cb: ((e: NativeKeyEvent) => boolean) | null): void {
    this.rawHandler = cb
    this.syncRuleset()
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.startedAt = Date.now()
    manoHook.start((e: NativeKeyEvent) => this.onEvent(e))
    this.syncRuleset()
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    try {
      manoHook.stop()
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
    this.syncRuleset()
  }

  isSuspended(): boolean {
    return this.suspended
  }

  setSuspendAccelerator(accel: string): void {
    this.suspendAccel = parseAccelerator(accel)
    this.syncRuleset()
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
      const vk = KEY_TO_VK[accel.key]
      if (vk === undefined) {
        failed.push(m.id)
        continue
      }
      compiled.push({
        macro: m,
        accel,
        vk,
        mods: modMaskFromList(accel.modifiers),
        ruleId: `macro:${m.id}`
      })
    }
    this.macros = compiled
    this.macroById = new Map(compiled.map((c) => [c.ruleId, c]))
    this.syncRuleset()
    return failed
  }

  setRemaps(remaps: Remap[]): string[] {
    const compiled: CompiledRemap[] = []
    const failed: string[] = []
    for (const r of remaps) {
      if (!r.enabled) continue
      const accel = parseAccelerator(r.from)
      // Modifier-bearing source remaps now work (the LL hook can suppress
      // them), but the UI still constrains to single-key for now.
      if (!accel || accel.modifiers.length > 0) {
        failed.push(r.id)
        continue
      }
      const vk = KEY_TO_VK[accel.key]
      if (vk === undefined) {
        failed.push(r.id)
        continue
      }
      compiled.push({ remap: r, vk, ruleId: `remap:${r.id}` })
    }
    this.remaps = compiled
    this.remapById = new Map(compiled.map((c) => [c.ruleId, c]))
    this.syncRuleset()
    return failed
  }

  setHotstrings(hotstrings: Hotstring[]): void {
    this.hotstrings = hotstrings.filter((h) => h.enabled)
    this.hotstringBuf.setHotstrings(this.hotstrings)
  }

  /** Push the current macro+remap+suspend ruleset down to the native hook. */
  private syncRuleset(): void {
    if (!this.started) return
    const entries: { id: string; vk: number; mods: number; kind: 'hotkey' | 'remap' }[] = []
    // While recording, suppress nothing except the suspend toggle — the
    // user wants raw input captured, not their macros firing.
    if (!this.rawHandler) {
      for (const m of this.macros) {
        entries.push({ id: m.ruleId, vk: m.vk, mods: m.mods, kind: 'hotkey' })
      }
      for (const r of this.remaps) {
        entries.push({ id: r.ruleId, vk: r.vk, mods: 0, kind: 'remap' })
      }
    }
    if (this.suspendAccel) {
      const vk = KEY_TO_VK[this.suspendAccel.key]
      if (vk !== undefined) {
        entries.push({
          id: this.suspendRuleId,
          vk,
          mods: modMaskFromList(this.suspendAccel.modifiers),
          kind: 'hotkey'
        })
      }
    }
    manoHook.setRuleset({ entries, suspended: this.suspended })
  }

  private onEvent(e: NativeKeyEvent): void {
    const isMouse = e.kind !== 'key'

    // Track CapsLock toggle (best-effort) — keyboard events only.
    if (!isMouse && !e.up && e.vk === 0x14) this.capsLock = !this.capsLock

    // Mouse-button "up" events don't fire rules, but mouse-button "down"
    // and wheel events do. Keyboard "up" events never fire rules.
    if (e.up && e.kind !== 'mouseButton') return
    if (e.up) return

    if (e.ruleId === this.suspendRuleId) {
      this.handlers.onSuspendToggle()
      return
    }

    // Recording mode short-circuits everything else: rules are already
    // disabled at the native level, hotstrings are silenced, and we just
    // hand raw events to the recorder.
    if (this.rawHandler) {
      this.rawHandler(e)
      return
    }

    if (this.suspended) return

    refreshActiveWindow()
    const win = getLastActiveWindow()

    if (e.ruleId) {
      const macro = this.macroById.get(e.ruleId)
      if (macro) {
        if (contextAllows(macro.macro.appContext, win)) {
          this.handlers.onMacroTrigger(macro.macro)
        }
        this.hotstringBuf.reset()
        return
      }
      const remap = this.remapById.get(e.ruleId)
      if (remap) {
        this.handlers.onRemapFire(remap.remap)
        return
      }
    }

    // Mouse events never feed the hotstring buffer.
    if (isMouse) return

    if (isModifierVk(e.vk)) return

    // Hotstring buffer — printable chars only, no Ctrl/Alt/Win.
    if (e.mods & (MOD_CTRL | MOD_ALT | MOD_WIN)) {
      this.hotstringBuf.reset()
      return
    }
    if (e.vk === 0x08) {
      const match = this.hotstringBuf.onChar('\b', this.hotstrings)
      if (match) this.handlers.onHotstringFire(match)
      return
    }
    const shift = (e.mods & MOD_SHIFT) !== 0
    const ch = printableChar(e.vk, shift, this.capsLock)
    if (ch === null) {
      const name = VK_TO_KEY[e.vk]
      if (name === 'Enter' || name === 'NumpadEnter' || name === 'Tab') {
        const sep = name === 'Tab' ? '\t' : '\n'
        const match = this.hotstringBuf.onChar(sep, this.hotstrings)
        if (match) {
          this.handlers.onHotstringFire(match)
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
