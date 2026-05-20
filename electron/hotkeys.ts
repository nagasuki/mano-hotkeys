import { globalShortcut } from 'electron'
import { runActions } from './actions.js'
import type { BindResult, Macro } from './types.js'

const bound = new Set<string>()

export function unbindAll(): void {
  for (const accel of bound) {
    try {
      globalShortcut.unregister(accel)
    } catch {
      /* ignore */
    }
  }
  bound.clear()
}

export function bindMacros(macros: Macro[]): BindResult {
  unbindAll()
  const failed: string[] = []
  const seen = new Set<string>()

  for (const macro of macros) {
    if (!macro.enabled) continue
    const accel = (macro.accelerator || '').trim()
    if (!accel) continue
    if (seen.has(accel)) {
      // Duplicate accelerator within our set — first wins.
      failed.push(macro.id)
      continue
    }
    seen.add(accel)
    try {
      const ok = globalShortcut.register(accel, () => {
        void runActions(macro.actions)
      })
      if (ok) bound.add(accel)
      else failed.push(macro.id)
    } catch (err) {
      console.error('[hotkeys] failed to bind', accel, err)
      failed.push(macro.id)
    }
  }

  return { ok: failed.length === 0, failed }
}
