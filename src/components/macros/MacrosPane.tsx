import { useMemo } from 'react'
import { emptyAppContext, type Macro } from '../../types'
import { prettify } from '../../lib/accelerator'
import { Keyboard } from '../Icons'
import { ListSidebar } from '../common/ListSidebar'
import { EmptyPane } from '../common/EmptyPane'
import { MacroEditor } from './MacroEditor'

interface Props {
  macros: Macro[]
  setMacros(m: Macro[]): void
  selectedId: string | null
  setSelectedId(id: string | null): void
  failedIds: string[]
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function MacrosPane({ macros, setMacros, selectedId, setSelectedId, failedIds }: Props) {
  const selected = useMemo(() => macros.find((m) => m.id === selectedId) ?? null, [macros, selectedId])

  const handleCreate = () => {
    const m: Macro = {
      id: newId(),
      name: 'New macro',
      accelerator: '',
      enabled: true,
      appContext: emptyAppContext(),
      actions: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setMacros([m, ...macros])
    setSelectedId(m.id)
  }

  const handleUpdate = (next: Macro) =>
    setMacros(macros.map((m) => (m.id === next.id ? next : m)))

  const handleDelete = () => {
    if (!selected) return
    const idx = macros.findIndex((m) => m.id === selected.id)
    const next = macros.filter((m) => m.id !== selected.id)
    setMacros(next)
    setSelectedId(next[idx]?.id ?? next[idx - 1]?.id ?? next[0]?.id ?? null)
  }

  const items = macros.map((m) => ({
    id: m.id,
    primary: m.name,
    secondary: m.accelerator ? prettify(m.accelerator) : 'Unbound',
    status: (!m.enabled ? 'off' : failedIds.includes(m.id) ? 'error' : 'on') as 'off' | 'error' | 'on'
  }))

  return (
    <div className="flex min-h-0 flex-1">
      <ListSidebar
        items={items}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={handleCreate}
        searchPlaceholder="Search macros"
        emptyHint="No macros yet"
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
          <EmptyPane
            icon={<Keyboard size={26} />}
            title="No macro selected"
            body="Create a new macro to bind a global hotkey to a sequence of actions."
            onCreate={handleCreate}
            createLabel="New macro"
          />
        )}
      </main>
    </div>
  )
}
