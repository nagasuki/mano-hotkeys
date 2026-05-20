interface Props {
  status?: string
}

export function Titlebar({ status }: Props) {
  return (
    <div className="drag flex h-9 shrink-0 items-center justify-between border-b border-ink-800/80 bg-ink-950 px-3 text-xs text-ink-400">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-accent-500/80 shadow-[0_0_8px] shadow-accent-500/60" />
        <span className="font-medium tracking-wide text-ink-200">Mano Hotkeys</span>
      </div>
      <div className="no-drag truncate text-[11px] text-ink-500">{status}</div>
    </div>
  )
}
