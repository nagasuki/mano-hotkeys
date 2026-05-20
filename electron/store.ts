import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { AppSettings, Hotstring, Macro, Remap, StoreShape } from './types.js'

const DEFAULTS: StoreShape = {
  macros: [],
  hotstrings: [],
  remaps: [],
  settings: {
    startMinimized: false,
    launchOnLogin: false,
    theme: 'dark',
    suspendAccelerator: 'Ctrl+Alt+Pause',
    suspended: false
  }
}

let cache: StoreShape | null = null
let filePath = ''

function ensureLoaded(): StoreShape {
  if (cache) return cache
  filePath = path.join(app.getPath('userData'), 'mano-hotkeys.json')
  const dir = path.dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<StoreShape>
      cache = {
        macros: normaliseMacros(parsed.macros ?? []),
        hotstrings: parsed.hotstrings ?? [],
        remaps: parsed.remaps ?? [],
        settings: { ...DEFAULTS.settings, ...(parsed.settings ?? {}) }
      }
    } catch (err) {
      console.error('[store] failed to parse, using defaults:', err)
      cache = structuredClone(DEFAULTS)
    }
  } else {
    cache = structuredClone(DEFAULTS)
    writeFileSync(filePath, JSON.stringify(cache, null, 2), 'utf8')
  }
  return cache
}

/**
 * Older versions stored macros with `value: string` on actions. The current
 * shape uses `params: Record<string, ...>`. Migrate on load so saved data
 * keeps working across upgrades.
 */
function normaliseMacros(input: any[]): Macro[] {
  return input.map((m) => ({
    ...m,
    appContext: m.appContext ?? { rules: [], negate: false },
    actions: (m.actions ?? []).map((a: any) => {
      if (a.params) return a
      // Legacy single-string `value` → migrate to params per action kind.
      const v = typeof a.value === 'string' ? a.value : ''
      const params: Record<string, string | number | boolean> = {}
      switch (a.kind) {
        case 'launch': params.target = v; break
        case 'open-url': params.url = v; break
        case 'run-command': params.command = v; break
        case 'type-text': params.text = v; params.wpm = 0; break
        case 'paste-text': params.text = v; break
        case 'send-keys': params.keys = v; break
        case 'notify': params.title = 'Mano Hotkeys'; params.body = v; break
      }
      return { kind: a.kind, params, delayMs: a.delayMs ?? 0 }
    })
  }))
}

let writeTimer: NodeJS.Timeout | null = null
function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(async () => {
    if (!cache) return
    try {
      await fs.writeFile(filePath, JSON.stringify(cache, null, 2), 'utf8')
    } catch (err) {
      console.error('[store] write failed:', err)
    }
  }, 150)
}

export const store = {
  getAll(): StoreShape {
    return ensureLoaded()
  },
  getMacros(): Macro[] {
    return ensureLoaded().macros
  },
  setMacros(macros: Macro[]): void {
    ensureLoaded().macros = macros
    scheduleWrite()
  },
  getHotstrings(): Hotstring[] {
    return ensureLoaded().hotstrings
  },
  setHotstrings(hotstrings: Hotstring[]): void {
    ensureLoaded().hotstrings = hotstrings
    scheduleWrite()
  },
  getRemaps(): Remap[] {
    return ensureLoaded().remaps
  },
  setRemaps(remaps: Remap[]): void {
    ensureLoaded().remaps = remaps
    scheduleWrite()
  },
  getSettings(): AppSettings {
    return ensureLoaded().settings
  },
  setSettings(settings: AppSettings): void {
    ensureLoaded().settings = settings
    scheduleWrite()
  }
}
