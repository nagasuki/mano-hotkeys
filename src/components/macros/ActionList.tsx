import { ACTION_CATEGORIES, ACTION_LABELS, ACTION_SCHEMA, defaultParams, type ActionKind, type ActionParam, type MacroAction } from '../../types'
import { Plus, Trash } from '../Icons'

interface Props {
  actions: MacroAction[]
  onChange(actions: MacroAction[]): void
}

export function ActionList({ actions, onChange }: Props) {
  const update = (idx: number, patch: Partial<MacroAction>) => {
    const next = actions.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  const remove = (idx: number) => onChange(actions.filter((_, i) => i !== idx))
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= actions.length) return
    const next = actions.slice()
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }
  const add = () => onChange([...actions, { kind: 'notify', params: defaultParams('notify'), delayMs: 0 }])
  const changeKind = (idx: number, kind: ActionKind) =>
    update(idx, { kind, params: defaultParams(kind) })

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action, idx) => (
        <div key={idx} className="group rounded-lg border border-ink-800 bg-ink-900/40 p-3 transition hover:border-ink-700">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink-500">{String(idx + 1).padStart(2, '0')}</span>
            <select
              value={action.kind}
              onChange={(e) => changeKind(idx, e.target.value as ActionKind)}
              className="flex-1 rounded-md border border-ink-800 bg-ink-950/70 px-2 py-1.5 text-sm text-ink-100 focus:border-ink-700"
            >
              {ACTION_CATEGORIES.map((cat) => (
                <optgroup key={cat.label} label={cat.label}>
                  {cat.kinds.map((k) => (
                    <option key={k} value={k}>{ACTION_LABELS[k]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded px-1.5 py-1 text-xs text-ink-500 hover:bg-ink-800 hover:text-ink-200 disabled:opacity-30 disabled:hover:bg-transparent" title="Move up">↑</button>
            <button onClick={() => move(idx, 1)} disabled={idx === actions.length - 1} className="rounded px-1.5 py-1 text-xs text-ink-500 hover:bg-ink-800 hover:text-ink-200 disabled:opacity-30 disabled:hover:bg-transparent" title="Move down">↓</button>
            <button onClick={() => remove(idx)} className="rounded p-1 text-ink-500 hover:bg-rose-500/10 hover:text-rose-400" title="Remove"><Trash /></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ACTION_SCHEMA[action.kind].map((param) => (
              <ParamInput
                key={param.name}
                param={param}
                value={action.params[param.name]}
                onChange={(v) => update(idx, { params: { ...action.params, [param.name]: v } })}
              />
            ))}
          </div>

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
      ))}

      <button
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-800 py-2.5 text-sm text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
      >
        <Plus /> Add action
      </button>
    </div>
  )
}

function ParamInput({
  param,
  value,
  onChange
}: {
  param: ActionParam
  value: string | number | boolean | undefined
  onChange(v: string | number | boolean): void
}) {
  const span = param.kind === 'multiline' ? 'col-span-2' : 'col-span-1'

  const labelEl = (
    <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-500">{param.label}</label>
  )

  if (param.kind === 'checkbox') {
    return (
      <div className={span}>
        <label className="flex items-center gap-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-ink-700 bg-ink-950 text-accent-500 focus:ring-accent-500"
          />
          {param.label}
        </label>
      </div>
    )
  }

  if (param.kind === 'select') {
    return (
      <div className={span}>
        {labelEl}
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-ink-800 bg-ink-950/70 px-2 py-1.5 text-sm text-ink-100 focus:border-ink-700"
        >
          {param.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (param.kind === 'number') {
    return (
      <div className={span}>
        {labelEl}
        <input
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder={param.placeholder}
          className="w-full rounded-md border border-ink-800 bg-ink-950/70 px-2.5 py-1.5 text-sm text-ink-100 focus:border-ink-700"
        />
      </div>
    )
  }

  if (param.kind === 'multiline') {
    return (
      <div className={span}>
        {labelEl}
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.placeholder}
          rows={3}
          className="w-full resize-y rounded-md border border-ink-800 bg-ink-950/70 px-2.5 py-1.5 font-mono text-[13px] text-ink-100 placeholder:text-ink-600 focus:border-ink-700"
        />
      </div>
    )
  }

  return (
    <div className={span}>
      {labelEl}
      <input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.placeholder}
        className="w-full rounded-md border border-ink-800 bg-ink-950/70 px-2.5 py-1.5 font-mono text-[13px] text-ink-100 placeholder:text-ink-600 focus:border-ink-700"
      />
    </div>
  )
}
