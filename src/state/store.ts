import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { AppSettings, EngineStatus, Hotstring, Macro, Remap } from '../types'

/**
 * Central renderer-side store that owns all four entity collections and the
 * status bar. Mutations are debounced and pushed to main, which echoes the
 * engine status back over the `engine:update` channel.
 */
export function useStore() {
  const [macros, setMacros] = useState<Macro[]>([])
  const [hotstrings, setHotstrings] = useState<Hotstring[]>([])
  const [remaps, setRemaps] = useState<Remap[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [failed, setFailed] = useState<{ macros: string[]; remaps: string[] }>({ macros: [], remaps: [] })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      const [m, h, r, s, st] = await Promise.all([
        api.listMacros(),
        api.listHotstrings(),
        api.listRemaps(),
        api.getSettings(),
        api.engineStatus()
      ])
      setMacros(m)
      setHotstrings(h)
      setRemaps(r)
      setSettings(s)
      setStatus(st)
      setLoaded(true)
    })()

    const off = api.onEngineUpdate(setStatus)
    return off
  }, [])

  // ── Macro debounced persistence ────────────────────────────────────────
  const macroTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (macroTimer.current) window.clearTimeout(macroTimer.current)
    macroTimer.current = window.setTimeout(async () => {
      const result = await api.saveMacros(macros)
      setFailed((f) => ({ ...f, macros: result.failed }))
    }, 200)
  }, [macros, loaded])

  const hsTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (hsTimer.current) window.clearTimeout(hsTimer.current)
    hsTimer.current = window.setTimeout(async () => {
      await api.saveHotstrings(hotstrings)
    }, 200)
  }, [hotstrings, loaded])

  const remapTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (remapTimer.current) window.clearTimeout(remapTimer.current)
    remapTimer.current = window.setTimeout(async () => {
      const result = await api.saveRemaps(remaps)
      setFailed((f) => ({ ...f, remaps: result.failed }))
    }, 200)
  }, [remaps, loaded])

  const saveSettings = useCallback(async (next: AppSettings) => {
    setSettings(next)
    await api.saveSettings(next)
  }, [])

  const toggleSuspended = useCallback(async () => {
    if (!settings) return
    const next = { ...settings, suspended: !settings.suspended }
    setSettings(next)
    await api.setSuspended(next.suspended)
  }, [settings])

  return {
    loaded,
    macros,
    setMacros,
    hotstrings,
    setHotstrings,
    remaps,
    setRemaps,
    settings,
    saveSettings,
    toggleSuspended,
    status,
    failed
  }
}
