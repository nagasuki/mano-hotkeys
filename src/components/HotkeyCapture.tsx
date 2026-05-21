import { useEffect, useRef, useState } from 'react'
import {
  eventToAccelerator,
  mouseEventToAccelerator,
  prettify,
  wheelEventToAccelerator
} from '../lib/accelerator'
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

    const insideButton = (target: EventTarget | null): boolean =>
      !!ref.current && ref.current.contains(target as Node)

    const onKey = (e: KeyboardEvent) => {
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

    const onMouseDown = (e: MouseEvent) => {
      // Click inside the trigger button cancels capture; anywhere else binds.
      if (insideButton(e.target)) {
        setCapturing(false)
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const accel = mouseEventToAccelerator(e)
      if (!accel) return
      onChange(accel)
      setCapturing(false)
    }

    const onWheel = (e: WheelEvent) => {
      if (insideButton(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      const accel = wheelEventToAccelerator(e)
      if (!accel) return
      onChange(accel)
      setCapturing(false)
    }

    const onContextMenu = (e: MouseEvent) => {
      // Stop the OS menu from eating right-click captures.
      e.preventDefault()
    }

    window.addEventListener('keydown', onKey, { capture: true })
    window.addEventListener('mousedown', onMouseDown, { capture: true })
    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    window.addEventListener('contextmenu', onContextMenu, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true } as any)
      window.removeEventListener('mousedown', onMouseDown, { capture: true } as any)
      window.removeEventListener('wheel', onWheel, { capture: true } as any)
      window.removeEventListener('contextmenu', onContextMenu, { capture: true } as any)
    }
  }, [capturing, onChange])

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
            <span className="text-ink-400">Press a key, click, or scroll… (Esc to cancel)</span>
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
