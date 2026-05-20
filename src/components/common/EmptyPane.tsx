import type { ReactNode } from 'react'
import { Plus } from '../Icons'

interface Props {
  icon: ReactNode
  title: string
  body: string
  onCreate(): void
  createLabel?: string
}

export function EmptyPane({ icon, title, body, onCreate, createLabel = 'Create new' }: Props) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/60 text-ink-400">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-ink-100">{title}</h2>
        <p className="mt-1 text-sm text-ink-500">{body}</p>
        <button
          onClick={onCreate}
          className="mt-5 flex items-center gap-1.5 rounded-md bg-accent-500 px-3.5 py-2 text-sm font-medium text-ink-950 transition hover:bg-accent-400"
        >
          <Plus /> {createLabel}
        </button>
      </div>
    </div>
  )
}
