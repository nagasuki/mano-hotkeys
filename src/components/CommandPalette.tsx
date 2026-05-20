import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Hotstring, Macro, Remap } from '../types'
import { prettify } from '../lib/accelerator'
import { Command, Keyboard, Pause, Play, Plus, Repeat, Settings as SettingsIcon, Wand } from './Icons'

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  icon: ReactNode
  run(): void
}

interface Props {
  open: boolean
  onClose(): void
  macros: Macro[]
  hotstrings: Hotstring[]
  remaps: Remap[]
  suspended: boolean
  onNavigate(tab: 'macros' | 'hotstrings' | 'remaps' | 'settings', id?: string): void
  onCreate(tab: 'macros' | 'hotstrings' | 'remaps'): void
  onToggleSuspended(): void
}

export function CommandPalette({
  open,
  onClose,
  macros,
  hotstrings,
  remaps,
  suspended,
  onNavigate,
  onCreate,
  onToggleSuspended
}: Props) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHighlight(0)
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  const actions = useMemo<PaletteAction[]>(() => {
    const base: PaletteAction[] = [
      { id: 'new-macro', label: 'New macro', icon: <Plus />, run: () => onCreate('macros') },
      { id: 'new-hotstring', label: 'New hotstring', icon: <Plus />, run: () => onCreate('hotstrings') },
      { id: 'new-remap', label: 'New remap', icon: <Plus />, run: () => onCreate('remaps') },
      {
        id: 'toggle-suspend',
        label: suspended ? 'Resume engine' : 'Suspend engine',
        icon: suspended ? <Play /> : <Pause />,
        run: onToggleSuspended
      },
      { id: 'open-settings', label: 'Open settings', icon: <SettingsIcon />, run: () => onNavigate('settings') }
    ]
    const macroEntries: PaletteAction[] = macros.map((m) => ({
      id: `macro:${m.id}`,
      label: m.name || 'Untitled',
      hint: m.accelerator ? prettify(m.accelerator) : 'Unbound',
      icon: <Keyboard />,
      run: () => onNavigate('macros', m.id)
    }))
    const hsEntries: PaletteAction[] = hotstrings.map((h) => ({
      id: `hs:${h.id}`,
      label: h.trigger || 'Untitled',
      hint: h.replacement.slice(0, 30),
      icon: <Wand />,
      run: () => onNavigate('hotstrings', h.id)
    }))
    const remapEntries: PaletteAction[] = remaps.map((r) => ({
      id: `rm:${r.id}`,
      label: `${r.from || '?'} → ${r.to || '?'}`,
      icon: <Repeat />,
      run: () => onNavigate('remaps', r.id)
    }))
    return [...base, ...macroEntries, ...hsEntries, ...remapEntries]
  }, [macros, hotstrings, remaps, suspended, onNavigate, onCreate, onToggleSuspended])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || (a.hint ?? '').toLowerCase().includes(q)
    )
  }, [actions, query])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  if (!open) return null

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[highlight]
      if (target) {
        target.run()
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-24 w-[560px] overflow-hidden rounded-xl border border-ink-700 bg-ink-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-ink-800 px-3 py-2.5">
          <Command className="text-ink-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none"
          />
          <kbd className="rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">Esc</kbd>
        </div>
        <ul className="scroll-soft max-h-[360px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-500">No results</li>
          ) : (
            filtered.map((a, i) => (
              <li key={a.id}>
                <button
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    a.run()
                    onClose()
                  }}
                  className={[
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition',
                    i === highlight ? 'bg-ink-800 text-ink-50' : 'text-ink-300 hover:bg-ink-800/50'
                  ].join(' ')}
                >
                  <span className="text-ink-500">{a.icon}</span>
                  <span className="flex-1 truncate">{a.label}</span>
                  {a.hint && <span className="truncate font-mono text-[11px] text-ink-500">{a.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
