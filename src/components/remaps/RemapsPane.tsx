import { type Remap } from '../../types'
import { prettify } from '../../lib/accelerator'
import { Plus, Repeat, Trash } from '../Icons'
import { Toggle } from '../common/Toggle'
import { HotkeyCapture } from '../HotkeyCapture'

interface Props {
  remaps: Remap[]
  setRemaps(r: Remap[]): void
  failedIds: string[]
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function RemapsPane({ remaps, setRemaps, failedIds }: Props) {
  const create = () => {
    const r: Remap = {
      id: newId(),
      from: '',
      to: '',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setRemaps([r, ...remaps])
  }

  const update = (id: string, patch: Partial<Remap>) =>
    setRemaps(remaps.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)))

  const remove = (id: string) => setRemaps(remaps.filter((r) => r.id !== id))

  return (
    <div className="scroll-soft min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink-50 flex items-center gap-2">
              <Repeat /> Key remaps
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Rebind a single physical key to a different combination — e.g. CapsLock → Esc.
            </p>
          </div>
          <button
            onClick={create}
            className="flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-ink-950 transition hover:bg-accent-400"
          >
            <Plus /> New remap
          </button>
        </div>

        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          <strong>Heads up:</strong> remaps fire the new combination in addition to the original key. Native suppression of the source key isn't yet supported by the input hook — pick source keys you can dedicate (CapsLock, F-keys, etc.).
        </div>

        {remaps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-800 p-10 text-center text-sm text-ink-500">
            No remaps yet. Press <em>New remap</em> above to bind one.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {remaps.map((r) => {
              const failed = failedIds.includes(r.id)
              return (
                <li key={r.id} className={[
                  'flex items-center gap-3 rounded-lg border bg-ink-900/40 p-3 transition',
                  failed ? 'border-rose-500/40' : 'border-ink-800 hover:border-ink-700'
                ].join(' ')}>
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex-1">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">From</p>
                      <HotkeyCapture
                        value={r.from}
                        onChange={(from) => update(r.id, { from })}
                        invalid={failed}
                      />
                    </div>
                    <span className="mt-4 text-ink-500">→</span>
                    <div className="flex-1">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">To</p>
                      <HotkeyCapture
                        value={r.to}
                        onChange={(to) => update(r.id, { to })}
                      />
                    </div>
                  </div>
                  <Toggle checked={r.enabled} onChange={(v) => update(r.id, { enabled: v })} />
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-md p-2 text-ink-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
