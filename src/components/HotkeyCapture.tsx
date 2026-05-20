import { useEffect, useRef, useState } from 'react'
import { eventToAccelerator, prettify } from '../lib/accelerator'
import { Keyboard } from './Icons'

interface Props {
  value: string
  onChange(accelerator: string): void
  invalid?: boolean
}

export function HotkeyCapture({ value, onChange, invalid }: Props) {
  const [capturing, setCapturing] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!capturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturing(false)
        return
      }
      const accel = eventToAccelerator(e)
      if (!accel) return
      onChange(accel)
      setCapturing(false)
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true } as any)
  }, [capturing, onChange])

  // Click-outside to cancel capture
  useEffect(() => {
    if (!capturing) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setCapturing(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [capturing])

  return (
    <div className="flex items-center gap-2">
      <button
        ref={ref}
        onClick={() => setCapturing(true)}
        className={[
          'flex flex-1 items-center justify-between rounded-md border bg-ink-950/60 px-3 py-2 text-left font-mono text-sm transition',
          capturing
            ? 'border-accent-500/70 text-accent-400'
            : invalid
              ? 'border-rose-500/60 text-rose-300'
              : 'border-ink-800 text-ink-100 hover:border-ink-700'
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          <Keyboard className="text-ink-500" />
          {capturing ? (
            <span className="text-ink-400">Press a key combination… (Esc to cancel)</span>
          ) : value ? (
            <span>{prettify(value)}</span>
          ) : (
            <span className="text-ink-500">Click to bind a hotkey</span>
          )}
        </span>
        {value && !capturing && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="rounded px-2 py-0.5 text-xs text-ink-500 hover:bg-ink-800 hover:text-ink-200"
          >
            clear
          </span>
        )}
      </button>
    </div>
  )
}
