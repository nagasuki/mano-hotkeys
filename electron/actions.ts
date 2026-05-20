import { clipboard, Notification, shell } from 'electron'
import { spawn } from 'node:child_process'
import type { MacroAction } from './types.js'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Send keystrokes through PowerShell's SendKeys. The string uses SendKeys
 * syntax: e.g. "^c" for Ctrl+C, "%{F4}" for Alt+F4, "Hello{ENTER}".
 */
function sendKeysViaPowerShell(keys: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Escape single quotes for PowerShell single-quoted string.
    const escaped = keys.replace(/'/g, "''")
    const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
      { windowsHide: true }
    )
    let stderr = ''
    child.stderr.on('data', (b) => {
      stderr += b.toString()
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`SendKeys exited ${code}: ${stderr.trim()}`))
    })
  })
}

function typeLiteralText(text: string): Promise<void> {
  // SendKeys treats + ^ % ~ ( ) { } as special — escape by wrapping in braces.
  const escaped = text.replace(/[+^%~(){}\[\]]/g, (ch) => `{${ch}}`)
  return sendKeysViaPowerShell(escaped)
}

async function runAction(action: MacroAction): Promise<void> {
  if (action.delayMs && action.delayMs > 0) await sleep(action.delayMs)
  const value = action.value ?? ''
  switch (action.kind) {
    case 'launch': {
      // Use shell.openPath for paths/files, falls back to spawn for command lines.
      const trimmed = value.trim()
      if (!trimmed) return
      const result = await shell.openPath(trimmed)
      if (result) {
        // openPath returns error string when failed — try spawn detached.
        spawn(trimmed, { detached: true, stdio: 'ignore', shell: true }).unref()
      }
      return
    }
    case 'open-url': {
      if (!value) return
      const url = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`
      await shell.openExternal(url)
      return
    }
    case 'run-command': {
      if (!value) return
      const child = spawn(value, { detached: true, stdio: 'ignore', shell: true })
      child.unref()
      return
    }
    case 'type-text': {
      if (!value) return
      await typeLiteralText(value)
      return
    }
    case 'paste-text': {
      if (!value) return
      const previous = clipboard.readText()
      clipboard.writeText(value)
      // Brief delay so the target app sees the new clipboard contents.
      await sleep(40)
      await sendKeysViaPowerShell('^v')
      // Restore previous clipboard after paste settles.
      setTimeout(() => clipboard.writeText(previous), 400)
      return
    }
    case 'send-keys': {
      if (!value) return
      await sendKeysViaPowerShell(value)
      return
    }
    case 'notify': {
      const n = new Notification({
        title: 'Mano Hotkeys',
        body: value || 'Macro triggered',
        silent: false
      })
      n.show()
      return
    }
  }
}

export async function runActions(actions: MacroAction[]): Promise<void> {
  for (const action of actions) {
    try {
      await runAction(action)
    } catch (err) {
      console.error('[actions] failed:', action, err)
    }
  }
}
