import { useState } from 'react'
import type { Macro } from '../types'
import { api } from '../api'
import { HotkeyCapture } from './HotkeyCapture'
import { ActionList } from './ActionList'
import { Play, Trash } from './Icons'

interface Props {
  macro: Macro
  failed: boolean
  onChange(macro: Macro): void
  onDelete(): void
}

export function MacroEditor({ macro, failed, onChange, onDelete }: Props) {
  const [testing, setTesting] = useState(false)

  const patch = (p: Partial<Macro>) =>
    onChange({ ...macro, ...p, updatedAt: Date.now() })

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
        <label className="flex items-center gap-2 text-sm text-ink-300">
          <span>{macro.enabled ? 'Enabled' : 'Disabled'}</span>
          <button
            onClick={() => patch({ enabled: !macro.enabled })}
            className={[
              'relative h-5 w-9 rounded-full transition',
              macro.enabled ? 'bg-accent-500' : 'bg-ink-700'
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
                macro.enabled ? 'left-4' : 'left-0.5'
              ].join(' ')}
            />
          </button>
        </label>
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
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Trigger
          </h3>
          <HotkeyCapture
            value={macro.accelerator}
            onChange={(accel) => patch({ accelerator: accel })}
            invalid={failed}
          />
          {failed && (
            <p className="mt-2 text-xs text-rose-400">
              This hotkey could not be registered — it may be in use by another app or system shortcut.
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Actions
          </h3>
          <ActionList
            actions={macro.actions}
            onChange={(actions) => patch({ actions })}
          />
        </section>
      </div>
    </div>
  )
}
