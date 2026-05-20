import { useCallback, useEffect, useState } from 'react'
import { useStore } from './state/store'
import { Titlebar } from './components/Titlebar'
import { Tabs } from './components/Tabs'
import { CommandPalette } from './components/CommandPalette'
import { MacrosPane } from './components/macros/MacrosPane'
import { HotstringsPane } from './components/hotstrings/HotstringsPane'
import { RemapsPane } from './components/remaps/RemapsPane'
import { SettingsPane } from './components/settings/SettingsPane'
import { Keyboard, Wand, Repeat, Settings as SettingsIcon } from './components/Icons'

type Tab = 'macros' | 'hotstrings' | 'remaps' | 'settings'

const TABS = [
  { id: 'macros', label: 'Macros', icon: <Keyboard /> },
  { id: 'hotstrings', label: 'Hotstrings', icon: <Wand /> },
  { id: 'remaps', label: 'Remaps', icon: <Repeat /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> }
] as const

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('macros')
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null)
  const [selectedHotstring, setSelectedHotstring] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Default-select first item in macros/hotstrings on first load.
  useEffect(() => {
    if (store.loaded && !selectedMacro && store.macros[0]) setSelectedMacro(store.macros[0].id)
  }, [store.loaded, store.macros, selectedMacro])
  useEffect(() => {
    if (store.loaded && !selectedHotstring && store.hotstrings[0]) setSelectedHotstring(store.hotstrings[0].id)
  }, [store.loaded, store.hotstrings, selectedHotstring])

  // Ctrl+K opens the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleNavigate = useCallback(
    (target: Tab, id?: string) => {
      setTab(target)
      if (target === 'macros' && id) setSelectedMacro(id)
      if (target === 'hotstrings' && id) setSelectedHotstring(id)
    },
    []
  )

  const handleCreate = useCallback(
    (target: 'macros' | 'hotstrings' | 'remaps') => {
      setTab(target)
      // The pane will see its empty selection and we'll let the user use its
      // local "New" button — but for palette UX, jump them to the pane.
    },
    []
  )

  if (!store.loaded || !store.settings) {
    return (
      <div className="flex h-full items-center justify-center bg-ink-950 text-sm text-ink-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-950">
      <Titlebar status={store.status} onToggleSuspend={store.toggleSuspended} />
      <Tabs tabs={[...TABS]} active={tab} onChange={(id) => setTab(id as Tab)} />
      <div className="flex min-h-0 flex-1">
        {tab === 'macros' && (
          <MacrosPane
            macros={store.macros}
            setMacros={store.setMacros}
            selectedId={selectedMacro}
            setSelectedId={setSelectedMacro}
            failedIds={store.failed.macros}
          />
        )}
        {tab === 'hotstrings' && (
          <HotstringsPane
            hotstrings={store.hotstrings}
            setHotstrings={store.setHotstrings}
            selectedId={selectedHotstring}
            setSelectedId={setSelectedHotstring}
          />
        )}
        {tab === 'remaps' && (
          <RemapsPane
            remaps={store.remaps}
            setRemaps={store.setRemaps}
            failedIds={store.failed.remaps}
          />
        )}
        {tab === 'settings' && (
          <SettingsPane settings={store.settings} onSave={store.saveSettings} />
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        macros={store.macros}
        hotstrings={store.hotstrings}
        remaps={store.remaps}
        suspended={store.status?.suspended ?? false}
        onNavigate={handleNavigate}
        onCreate={handleCreate}
        onToggleSuspended={store.toggleSuspended}
      />
    </div>
  )
}
