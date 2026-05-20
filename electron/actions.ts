import { clipboard, Notification, shell } from 'electron'
import { spawn } from 'node:child_process'
import type { MacroAction } from './types.js'
import { pressBackspace, sendKeys, typeText } from './output/keyboard.js'
import { closeWindow, focusWindow, minimizeWindow, mouseClick, mouseMove, mouseScroll } from './output/win32.js'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function s(action: MacroAction, name: string, fallback = ''): string {
  const v = action.params?.[name]
  return typeof v === 'string' ? v : fallback
}
function n(action: MacroAction, name: string, fallback = 0): number {
  const v = action.params?.[name]
  return typeof v === 'number' ? v : Number(v) || fallback
}
function b(action: MacroAction, name: string, fallback = false): boolean {
  const v = action.params?.[name]
  return typeof v === 'boolean' ? v : fallback
}

async function runAction(action: MacroAction): Promise<void> {
  if (action.delayMs && action.delayMs > 0) await sleep(action.delayMs)
  switch (action.kind) {
    case 'launch': {
      const target = s(action, 'target').trim()
      if (!target) return
      const err = await shell.openPath(target)
      if (err) {
        // openPath returns non-empty error string on failure; fall back to spawn.
        spawn(target, { detached: true, stdio: 'ignore', shell: true }).unref()
      }
      return
    }
    case 'open-url': {
      const url = s(action, 'url').trim()
      if (!url) return
      const final = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`
      await shell.openExternal(final)
      return
    }
    case 'run-command': {
      const cmd = s(action, 'command').trim()
      if (!cmd) return
      spawn(cmd, { detached: true, stdio: 'ignore', shell: true }).unref()
      return
    }
    case 'type-text': {
      const text = s(action, 'text')
      if (!text) return
      const wpm = n(action, 'wpm', 0)
      const delay = wpm > 0 ? Math.max(1, Math.round(100 / wpm)) : 0
      await typeText(text, delay)
      return
    }
    case 'paste-text': {
      const text = s(action, 'text')
      if (!text) return
      const previous = clipboard.readText()
      clipboard.writeText(text)
      await sleep(40)
      await sendKeys('Ctrl+V')
      setTimeout(() => clipboard.writeText(previous), 500)
      return
    }
    case 'send-keys': {
      const keys = s(action, 'keys')
      if (!keys) return
      await sendKeys(keys)
      return
    }
    case 'notify': {
      new Notification({
        title: s(action, 'title', 'Mano Hotkeys'),
        body: s(action, 'body', 'Macro fired'),
        silent: false
      }).show()
      return
    }
    case 'sleep': {
      const ms = n(action, 'ms', 250)
      await sleep(ms)
      return
    }
    case 'mouse-move': {
      await mouseMove(n(action, 'x'), n(action, 'y'), b(action, 'relative'))
      return
    }
    case 'mouse-click': {
      const button = (s(action, 'button', 'left') as 'left' | 'right' | 'middle') || 'left'
      await mouseClick(button, Math.max(1, n(action, 'count', 1)))
      return
    }
    case 'mouse-scroll': {
      await mouseScroll(n(action, 'amount', 3))
      return
    }
    case 'window-focus': {
      await focusWindow(s(action, 'titleContains'))
      return
    }
    case 'window-close': {
      await closeWindow(s(action, 'titleContains'))
      return
    }
    case 'window-minimize': {
      await minimizeWindow(s(action, 'titleContains'))
      return
    }
    case 'clipboard-set': {
      clipboard.writeText(s(action, 'text'))
      return
    }
    case 'clipboard-clear': {
      clipboard.clear()
      return
    }
  }
}

export async function runActions(actions: MacroAction[]): Promise<void> {
  for (const action of actions) {
    try {
      await runAction(action)
    } catch (err) {
      console.error('[actions] failed:', action.kind, err)
    }
  }
}

/**
 * Expand a hotstring: send backspaces to delete the trigger (and terminator
 * if applicable), then type the replacement.
 */
export async function expandHotstring(deleteCount: number, insert: string): Promise<void> {
  await pressBackspace(deleteCount)
  await typeText(insert)
}
