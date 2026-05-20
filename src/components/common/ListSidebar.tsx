import { useMemo, useState, type ReactNode } from 'react'
import { Plus, Search } from '../Icons'

interface Item {
  id: string
  primary: string
  secondary?: string
  status: 'on' | 'off' | 'error'
}

interface Props {
  items: Item[]
  selectedId: string | null
  onSelect(id: string): void
  onCreate(): void
  searchPlaceholder?: string
  createLabel?: string
  emptyHint?: ReactNode
}

export function ListSidebar({
  items,
  selectedId,
  onSelect,
  onCreate,
  searchPlaceholder = 'Search',
  emptyHint
}: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        i.primary.toLowerCase().includes(q) ||
        (i.secondary ?? '').toLowerCase().includes(q)
    )
  }, [items, query])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-800/80 bg-ink-900/40">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-ink-800 bg-ink-950/70 py-1.5 pl-8 pr-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-ink-700"
          />
        </div>
        <button
          onClick={onCreate}
          title="New"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-800 bg-ink-900 text-ink-200 transition hover:border-accent-500/60 hover:text-accent-400"
        >
          <Plus />
        </button>
      </div>

      <div className="scroll-soft flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-ink-500">
            {query ? 'No matches' : emptyHint ?? 'Nothing yet'}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((m) => {
              const isSelected = m.id === selectedId
              const dot = m.status === 'off' ? 'bg-ink-600' : m.status === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
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
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                      <span className="truncate text-sm font-medium">{m.primary || 'Untitled'}</span>
                    </div>
                    {m.secondary && (
                      <span className="ml-3.5 truncate font-mono text-[11px] text-ink-500">{m.secondary}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-ink-800/80 px-3 py-2 text-[11px] text-ink-500">
        {items.length} item{items.length === 1 ? '' : 's'}
      </div>
    </aside>
  )
}
