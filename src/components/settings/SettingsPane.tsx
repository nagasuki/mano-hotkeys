import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { AppSettings, WindowContext } from '../../types'
import { Toggle } from '../common/Toggle'
import { HotkeyCapture } from '../HotkeyCapture'
import { Settings as SettingsIcon, Window as WindowIcon } from '../Icons'

interface Props {
  settings: AppSettings
  onSave(s: AppSettings): void
}

export function SettingsPane({ settings, onSave }: Props) {
  const [activeWindow, setActiveWindow] = useState<WindowContext | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const win = await api.getActiveWindow()
      if (!cancelled) setActiveWindow(win)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = (p: Partial<AppSettings>) => onSave({ ...settings, ...p })

  return (
    <div className="scroll-soft min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="mb-6 flex items-center gap-2">
          <SettingsIcon />
          <h1 className="text-lg font-semibold text-ink-50">Settings</h1>
        </div>

        <Section title="Startup">
          <Row label="Start minimized to tray">
            <Toggle checked={settings.startMinimized} onChange={(v) => patch({ startMinimized: v })} />
          </Row>
          <Row label="Launch when I sign in">
            <Toggle checked={settings.launchOnLogin} onChange={(v) => patch({ launchOnLogin: v })} />
          </Row>
        </Section>

        <Section title="Engine">
          <Row label="Suspend toggle shortcut">
            <div className="w-72">
              <HotkeyCapture
                value={settings.suspendAccelerator}
                onChange={(suspendAccelerator) => patch({ suspendAccelerator })}
              />
            </div>
          </Row>
        </Section>

        <Section title="Active window (debug)">
          <div className="rounded-md border border-ink-800 bg-ink-950/60 p-3 font-mono text-xs text-ink-300">
            <div className="flex items-center gap-2 text-ink-500"><WindowIcon size={12} /> snapshot</div>
            {activeWindow ? (
              <>
                <p className="mt-2"><span className="text-ink-500">title </span>{activeWindow.title || '—'}</p>
                <p><span className="text-ink-500">class </span>{activeWindow.className || '—'}</p>
                <p className="break-all"><span className="text-ink-500">exe&nbsp;&nbsp; </span>{activeWindow.exe || '—'}</p>
              </>
            ) : (
              <p className="mt-2 text-ink-500">Detecting…</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{title}</h2>
      <div className="flex flex-col gap-3 rounded-lg border border-ink-800 bg-ink-900/40 p-4">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-200">{label}</span>
      {children}
    </div>
  )
}
