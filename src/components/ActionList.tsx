import { ACTION_LABELS, ACTION_PLACEHOLDERS, type MacroAction, type ActionKind } from '../types'
import { Trash, Plus } from './Icons'

interface Props {
  actions: MacroAction[]
  onChange(actions: MacroAction[]): void
}

const KINDS: ActionKind[] = [
  'launch',
  'open-url',
  'run-command',
  'type-text',
  'paste-text',
  'send-keys',
  'notify'
]

export function ActionList({ actions, onChange }: Props) {
  const update = (idx: number, patch: Partial<MacroAction>) => {
    const next = actions.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  const remove = (idx: number) => {
    onChange(actions.filter((_, i) => i !== idx))
  }
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= actions.length) return
    const next = actions.slice()
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }
  const add = () => {
    onChange([...actions, { kind: 'notify', value: '', delayMs: 0 }])
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action, idx) => {
        const multiline = action.kind === 'paste-text' || action.kind === 'notify'
        return (
          <div
            key={idx}
            className="group rounded-lg border border-ink-800 bg-ink-900/40 p-3 transition hover:border-ink-700"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-500">{String(idx + 1).padStart(2, '0')}</span>
              <select
                value={action.kind}
                onChange={(e) => update(idx, { kind: e.target.value as ActionKind, value: '' })}
                className="flex-1 rounded-md border border-ink-800 bg-ink-950/70 px-2 py-1.5 text-sm text-ink-100 focus:border-ink-700"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ACTION_LABELS[k]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="rounded px-1.5 py-1 text-xs text-ink-500 hover:bg-ink-800 hover:text-ink-200 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === actions.length - 1}
                className="rounded px-1.5 py-1 text-xs text-ink-500 hover:bg-ink-800 hover:text-ink-200 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => remove(idx)}
                className="rounded p-1 text-ink-500 hover:bg-rose-500/10 hover:text-rose-400"
                title="Remove"
              >
                <Trash />
              </button>
            </div>

            {multiline ? (
              <textarea
                value={action.value}
                onChange={(e) => update(idx, { value: e.target.value })}
                placeholder={ACTION_PLACEHOLDERS[action.kind]}
                rows={3}
                className="w-full resize-y rounded-md border border-ink-800 bg-ink-950/70 px-2.5 py-1.5 font-mono text-[13px] text-ink-100 placeholder:text-ink-600 focus:border-ink-700"
              />
            ) : (
              <input
                value={action.value}
                onChange={(e) => update(idx, { value: e.target.value })}
                placeholder={ACTION_PLACEHOLDERS[action.kind]}
                className="w-full rounded-md border border-ink-800 bg-ink-950/70 px-2.5 py-1.5 font-mono text-[13px] text-ink-100 placeholder:text-ink-600 focus:border-ink-700"
              />
            )}

            <div className="mt-2 flex items-center gap-2">
              <label className="text-[11px] text-ink-500">Delay before</label>
              <input
                type="number"
                min={0}
                step={50}
                value={action.delayMs ?? 0}
                onChange={(e) => update(idx, { delayMs: Math.max(0, Number(e.target.value) || 0) })}
                className="w-20 rounded-md border border-ink-800 bg-ink-950/70 px-2 py-0.5 text-xs text-ink-100 focus:border-ink-700"
              />
              <span className="text-[11px] text-ink-600">ms</span>
            </div>
          </div>
        )
      })}

      <button
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-800 py-2.5 text-sm text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
      >
        <Plus /> Add action
      </button>
    </div>
  )
}
