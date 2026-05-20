import { useMemo, useState } from 'react'
import type { Macro } from '../types'
import { prettify } from '../lib/accelerator'
import { Plus, Search } from './Icons'

interface Props {
  macros: Macro[]
  selectedId: string | null
  failedIds: string[]
  onSelect(id: string): void
  onCreate(): void
}

export function Sidebar({ macros, selectedId, failedIds, onSelect, onCreate }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return macros
    return macros.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.accelerator.toLowerCase().includes(q)
    )
  }, [macros, query])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-800/80 bg-ink-900/40">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search macros"
            className="w-full rounded-md border border-ink-800 bg-ink-950/70 py-1.5 pl-8 pr-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-ink-700"
          />
        </div>
        <button
          onClick={onCreate}
          title="New macro"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-800 bg-ink-900 text-ink-200 transition hover:border-accent-500/60 hover:text-accent-400"
        >
          <Plus />
        </button>
      </div>

      <div className="scroll-soft flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-ink-500">
            {query ? 'No matches' : 'No macros yet'}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((m) => {
              const isSelected = m.id === selectedId
              const isFailed = failedIds.includes(m.id)
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onSelect(m.id)}
                    className={[
                      'group flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition',
                      isSelected
                        ? 'bg-ink-800/70 text-ink-50'
                        : 'text-ink-300 hover:bg-ink-800/40 hover:text-ink-100'
                    ].join(' ')}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span
                        className={[
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          !m.enabled
                            ? 'bg-ink-600'
                            : isFailed
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                        ].join(' ')}
                      />
                      <span className="truncate text-sm font-medium">
                        {m.name || 'Untitled'}
                      </span>
                    </div>
                    <span className="ml-3.5 font-mono text-[11px] text-ink-500">
                      {m.accelerator ? prettify(m.accelerator) : 'Unbound'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-ink-800/80 px-3 py-2 text-[11px] text-ink-500">
        {macros.length} macro{macros.length === 1 ? '' : 's'}
      </div>
    </aside>
  )
}
