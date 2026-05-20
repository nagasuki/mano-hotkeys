import { useMemo } from 'react'
import { emptyAppContext, type Hotstring } from '../../types'
import { Wand } from '../Icons'
import { ListSidebar } from '../common/ListSidebar'
import { EmptyPane } from '../common/EmptyPane'
import { HotstringEditor } from './HotstringEditor'

interface Props {
  hotstrings: Hotstring[]
  setHotstrings(h: Hotstring[]): void
  selectedId: string | null
  setSelectedId(id: string | null): void
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function HotstringsPane({ hotstrings, setHotstrings, selectedId, setSelectedId }: Props) {
  const selected = useMemo(() => hotstrings.find((h) => h.id === selectedId) ?? null, [hotstrings, selectedId])

  const handleCreate = () => {
    const h: Hotstring = {
      id: newId(),
      trigger: '',
      replacement: '',
      caseSensitive: false,
      immediate: false,
      resetOnBackspace: true,
      enabled: true,
      appContext: emptyAppContext(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setHotstrings([h, ...hotstrings])
    setSelectedId(h.id)
  }

  const handleUpdate = (next: Hotstring) =>
    setHotstrings(hotstrings.map((h) => (h.id === next.id ? next : h)))

  const handleDelete = () => {
    if (!selected) return
    const idx = hotstrings.findIndex((h) => h.id === selected.id)
    const next = hotstrings.filter((h) => h.id !== selected.id)
    setHotstrings(next)
    setSelectedId(next[idx]?.id ?? next[idx - 1]?.id ?? next[0]?.id ?? null)
  }

  const items = hotstrings.map((h) => ({
    id: h.id,
    primary: h.trigger || 'Untitled',
    secondary: h.replacement.length > 30 ? h.replacement.slice(0, 30) + '…' : h.replacement,
    status: (h.enabled ? 'on' : 'off') as 'on' | 'off'
  }))

  return (
    <div className="flex min-h-0 flex-1">
      <ListSidebar
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={handleCreate}
        searchPlaceholder="Search hotstrings"
        emptyHint="No hotstrings yet"
      />
      <main className="min-w-0 flex-1">
        {selected ? (
          <HotstringEditor hotstring={selected} onChange={handleUpdate} onDelete={handleDelete} />
        ) : (
          <EmptyPane
            icon={<Wand size={26} />}
            title="No hotstring selected"
            body="Type a short trigger like 'btw' and have it expand to longer text in any app."
            onCreate={handleCreate}
            createLabel="New hotstring"
          />
        )}
      </main>
    </div>
  )
}
