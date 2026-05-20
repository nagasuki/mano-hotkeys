import type { EngineStatus } from '../types'
import { Pause, Play, Power } from './Icons'

interface Props {
  status: EngineStatus | null
  onToggleSuspend(): void
}

export function Titlebar({ status, onToggleSuspend }: Props) {
  const live = status?.hookActive ?? false
  const suspended = status?.suspended ?? false
  const dotColor = !live
    ? 'bg-rose-500'
    : suspended
      ? 'bg-amber-500'
      : 'bg-accent-500 shadow-[0_0_8px] shadow-accent-500/60'

  return (
    <div className="drag flex h-9 shrink-0 items-center justify-between border-b border-ink-800/80 bg-ink-950 px-3 text-xs text-ink-400">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="font-medium tracking-wide text-ink-200">Mano Hotkeys</span>
        {status && (
          <span className="ml-2 text-[11px] text-ink-500">
            {status.hotkeyCount} hotkey{status.hotkeyCount === 1 ? '' : 's'} ·
            {' '}{status.hotstringCount} hotstring{status.hotstringCount === 1 ? '' : 's'} ·
            {' '}{status.remapCount} remap{status.remapCount === 1 ? '' : 's'}
            {suspended && <span className="ml-2 text-amber-400">· suspended</span>}
            {!live && <span className="ml-2 text-rose-400">· engine offline</span>}
          </span>
        )}
      </div>
      <button
        onClick={onToggleSuspend}
        className="no-drag flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
      >
        {suspended ? <Play size={12} /> : <Pause size={12} />}
        {suspended ? 'Resume' : 'Suspend'}
      </button>
    </div>
  )
}
