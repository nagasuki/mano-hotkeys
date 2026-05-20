import { Plus, Keyboard } from './Icons'

interface Props {
  onCreate(): void
}

export function EmptyState({ onCreate }: Props) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/60 text-ink-400">
          <Keyboard size={26} />
        </div>
        <h2 className="text-lg font-semibold text-ink-100">No macro selected</h2>
        <p className="mt-1 text-sm text-ink-500">
          Create a new macro to bind a global hotkey to a sequence of actions.
        </p>
        <button
          onClick={onCreate}
          className="mt-5 flex items-center gap-1.5 rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-400"
        >
          <Plus /> New macro
        </button>
      </div>
    </div>
  )
}
