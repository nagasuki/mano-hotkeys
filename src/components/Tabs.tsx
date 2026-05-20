import type { ReactNode } from 'react'

export interface TabDef {
  id: string
  label: string
  icon: ReactNode
}

interface Props {
  tabs: TabDef[]
  active: string
  onChange(id: string): void
}

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-ink-800/80 bg-ink-950/70 px-3">
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={[
              'group relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition',
              isActive ? 'text-ink-50' : 'text-ink-500 hover:text-ink-200'
            ].join(' ')}
          >
            <span className={isActive ? 'text-accent-400' : ''}>{t.icon}</span>
            <span className="font-medium">{t.label}</span>
            {isActive && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}
