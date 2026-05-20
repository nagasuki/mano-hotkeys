import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { Macro } from './types'
import { Titlebar } from './components/Titlebar'
import { Sidebar } from './components/Sidebar'
import { MacroEditor } from './components/MacroEditor'
import { EmptyState } from './components/EmptyState'

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function newMacro(): Macro {
  const now = Date.now()
  return {
    id: newId(),
    name: 'New macro',
    accelerator: '',
    enabled: true,
    actions: [],
    createdAt: now,
    updatedAt: now
  }
}

export default function App() {
  const [macros, setMacros] = useState<Macro[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [failedIds, setFailedIds] = useState<string[]>([])
  const [status, setStatus] = useState<string>('Loading…')
  const loadedRef = useRef(false)

  useEffect(() => {
    void (async () => {
      const initial = await api.listMacros()
      setMacros(initial)
      setSelectedId(initial[0]?.id ?? null)
      loadedRef.current = true
      setStatus(`${initial.length} macro${initial.length === 1 ? '' : 's'} loaded`)
    })()
  }, [])

  // Debounced persistence — saves macros to disk and re-binds hotkeys.
  useEffect(() => {
    if (!loadedRef.current) return
    setStatus('Saving…')
    const t = setTimeout(async () => {
      const result = await api.saveMacros(macros)
      setFailedIds(result.failed)
      if (result.ok) {
        const bound = macros.filter((m) => m.enabled && m.accelerator).length
        setStatus(`Saved · ${bound} hotkey${bound === 1 ? '' : 's'} active`)
      } else {
        setStatus(`Saved · ${result.failed.length} binding${result.failed.length === 1 ? '' : 's'} failed`)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [macros])

  const selected = useMemo(
    () => macros.find((m) => m.id === selectedId) ?? null,
    [macros, selectedId]
  )

  const handleCreate = useCallback(() => {
    const m = newMacro()
    setMacros((cur) => [m, ...cur])
    setSelectedId(m.id)
  }, [])

  const handleUpdate = useCallback((next: Macro) => {
    setMacros((cur) => cur.map((m) => (m.id === next.id ? next : m)))
  }, [])

  const handleDelete = useCallback(() => {
    if (!selected) return
    const idx = macros.findIndex((m) => m.id === selected.id)
    const next = macros.filter((m) => m.id !== selected.id)
    setMacros(next)
    setSelectedId(next[idx]?.id ?? next[idx - 1]?.id ?? next[0]?.id ?? null)
  }, [macros, selected])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-950">
      <Titlebar status={status} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          macros={macros}
          selectedId={selectedId}
          failedIds={failedIds}
          onSelect={setSelectedId}
          onCreate={handleCreate}
        />
        <main className="min-w-0 flex-1">
          {selected ? (
            <MacroEditor
              macro={selected}
              failed={failedIds.includes(selected.id)}
              onChange={handleUpdate}
              onDelete={handleDelete}
            />
          ) : (
            <EmptyState onCreate={handleCreate} />
          )}
        </main>
      </div>
    </div>
  )
}
