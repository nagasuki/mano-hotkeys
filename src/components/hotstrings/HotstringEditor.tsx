import type { Hotstring } from '../../types'
import { Toggle } from '../common/Toggle'
import { Trash } from '../Icons'
import { AppContextEditor } from '../macros/AppContextEditor'

interface Props {
  hotstring: Hotstring
  onChange(h: Hotstring): void
  onDelete(): void
}

export function HotstringEditor({ hotstring, onChange, onDelete }: Props) {
  const patch = (p: Partial<Hotstring>) => onChange({ ...hotstring, ...p, updatedAt: Date.now() })

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-ink-800/80 px-6 py-4">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wider text-ink-500">Trigger</p>
          <input
            value={hotstring.trigger}
            onChange={(e) => patch({ trigger: e.target.value })}
            placeholder="btw"
            className="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-mono text-xl text-ink-50 placeholder:text-ink-600 focus:border-ink-700 focus:bg-ink-900/60"
          />
        </div>
        <Toggle checked={hotstring.enabled} onChange={(v) => patch({ enabled: v })} label={hotstring.enabled ? 'On' : 'Off'} />
        <button
          onClick={onDelete}
          className="rounded-md p-2 text-ink-500 transition hover:bg-rose-500/10 hover:text-rose-400"
          title="Delete"
        >
          <Trash />
        </button>
      </header>

      <div className="scroll-soft flex-1 overflow-y-auto px-6 py-5">
        <section className="mb-6">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Replacement</h3>
          <textarea
            value={hotstring.replacement}
            onChange={(e) => patch({ replacement: e.target.value })}
            placeholder="by the way"
            rows={4}
            className="w-full resize-y rounded-md border border-ink-800 bg-ink-950/70 px-3 py-2 font-mono text-sm text-ink-100 placeholder:text-ink-600 focus:border-ink-700"
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle
            checked={hotstring.caseSensitive}
            onChange={(v) => patch({ caseSensitive: v })}
            label="Match case"
          />
          <Toggle
            checked={hotstring.immediate}
            onChange={(v) => patch({ immediate: v })}
            label="Fire immediately (no terminator)"
          />
          <Toggle
            checked={hotstring.resetOnBackspace}
            onChange={(v) => patch({ resetOnBackspace: v })}
            label="Reset on backspace"
          />
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">App context</h3>
          <AppContextEditor value={hotstring.appContext} onChange={(appContext) => patch({ appContext })} />
        </section>
      </div>
    </div>
  )
}
