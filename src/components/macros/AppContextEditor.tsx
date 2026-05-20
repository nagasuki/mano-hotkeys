import type { AppContext, AppContextRule } from '../../types'
import { Trash, Plus } from '../Icons'
import { Toggle } from '../common/Toggle'

interface Props {
  value: AppContext
  onChange(value: AppContext): void
}

export function AppContextEditor({ value, onChange }: Props) {
  const update = (idx: number, patch: Partial<AppContextRule>) => {
    const rules = value.rules.slice()
    rules[idx] = { ...rules[idx], ...patch }
    onChange({ ...value, rules })
  }
  const remove = (idx: number) => {
    onChange({ ...value, rules: value.rules.filter((_, i) => i !== idx) })
  }
  const add = () => {
    onChange({
      ...value,
      rules: [...value.rules, { field: 'exe', op: 'contains', value: '', caseSensitive: false }]
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {value.rules.length === 0 ? (
        <p className="text-xs text-ink-500">
          Fires in any window. Add a rule to limit by window title, class, or exe.
        </p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-ink-500">
              Fires when {value.negate ? 'no rule' : 'any rule'} matches the active window
            </span>
            <Toggle checked={value.negate} onChange={(v) => onChange({ ...value, negate: v })} label="Negate" />
          </div>
          {value.rules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <select
                value={rule.field}
                onChange={(e) => update(idx, { field: e.target.value as AppContextRule['field'] })}
                className="rounded-md border border-ink-800 bg-ink-950/70 px-2 py-1.5 text-xs text-ink-100"
              >
                <option value="title">Title</option>
                <option value="class">Class</option>
                <option value="exe">Exe path</option>
              </select>
              <select
                value={rule.op}
                onChange={(e) => update(idx, { op: e.target.value as AppContextRule['op'] })}
                className="rounded-md border border-ink-800 bg-ink-950/70 px-2 py-1.5 text-xs text-ink-100"
              >
                <option value="contains">contains</option>
                <option value="equals">equals</option>
                <option value="regex">regex</option>
              </select>
              <input
                value={rule.value}
                onChange={(e) => update(idx, { value: e.target.value })}
                placeholder={rule.field === 'exe' ? 'notepad.exe' : 'Visual Studio'}
                className="flex-1 rounded-md border border-ink-800 bg-ink-950/70 px-2 py-1.5 font-mono text-xs text-ink-100 focus:border-ink-700"
              />
              <button
                onClick={() => remove(idx)}
                className="rounded p-1.5 text-ink-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash />
              </button>
            </div>
          ))}
        </>
      )}
      <button
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-ink-800 py-1.5 text-xs text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
      >
        <Plus /> Add rule
      </button>
    </div>
  )
}
