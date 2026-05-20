import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { StoreShape, Macro, AppSettings } from './types.js'

const DEFAULTS: StoreShape = {
  macros: [],
  settings: {
    startMinimized: false,
    launchOnLogin: false,
    theme: 'dark'
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
        macros: parsed.macros ?? [],
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
    const data = ensureLoaded()
    data.macros = macros
    scheduleWrite()
  },
  getSettings(): AppSettings {
    return ensureLoaded().settings
  },
  setSettings(settings: AppSettings): void {
    const data = ensureLoaded()
    data.settings = settings
    scheduleWrite()
  }
}
