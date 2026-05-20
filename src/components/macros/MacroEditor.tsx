import { useState } from 'react'
import type { Macro } from '../../types'
import { api } from '../../api'
import { HotkeyCapture } from '../HotkeyCapture'
import { Play, Trash } from '../Icons'
import { Toggle } from '../common/Toggle'
import { ActionList } from './ActionList'
import { AppContextEditor } from './AppContextEditor'

interface Props {
  macro: Macro
  failed: boolean
  onChange(macro: Macro): void
  onDelete(): void
}

export function MacroEditor({ macro, failed, onChange, onDelete }: Props) {
  const [testing, setTesting] = useState(false)

  const patch = (p: Partial<Macro>) => onChange({ ...macro, ...p, updatedAt: Date.now() })

  const runTest = async () => {
    setTesting(true)
    try {
      await api.testActions(macro.actions)
    } finally {
      setTimeout(() => setTesting(false), 400)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-ink-800/80 px-6 py-4">
        <input
          value={macro.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Untitled macro"
          className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xl font-medium text-ink-50 placeholder:text-ink-600 focus:border-ink-700 focus:bg-ink-900/60"
        />
        <button
          onClick={runTest}
          disabled={macro.actions.length === 0 || testing}
          className="flex items-center gap-1.5 rounded-md border border-ink-800 bg-ink-900 px-3 py-1.5 text-sm text-ink-200 transition hover:border-accent-500/60 hover:text-accent-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-800 disabled:hover:text-ink-200"
        >
          <Play />
          {testing ? 'Running…' : 'Test'}
        </button>
        <Toggle checked={macro.enabled} onChange={(v) => patch({ enabled: v })} label={macro.enabled ? 'On' : 'Off'} />
        <button
          onClick={onDelete}
          className="rounded-md p-2 text-ink-500 transition hover:bg-rose-500/10 hover:text-rose-400"
          title="Delete macro"
        >
          <Trash />
        </button>
      </header>

      <div className="scroll-soft flex-1 overflow-y-auto px-6 py-5">
        <section className="mb-6">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Trigger</h3>
          <HotkeyCapture
            value={macro.accelerator}
            onChange={(accel) => patch({ accelerator: accel })}
            invalid={failed}
          />
          {failed && (
            <p className="mt-2 text-xs text-rose-400">
              This hotkey could not be bound — invalid combination or already used by another macro.
            </p>
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">App context</h3>
          <AppContextEditor value={macro.appContext} onChange={(appContext) => patch({ appContext })} />
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Actions</h3>
          <ActionList actions={macro.actions} onChange={(actions) => patch({ actions })} />
        </section>
      </div>
    </div>
  )
}
