import { spawn } from 'node:child_process'
import type { WindowContext } from '../types.js'

const PS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class W {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
}
"@ -ErrorAction SilentlyContinue
$h = [W]::GetForegroundWindow()
$tb = New-Object Text.StringBuilder 512
[void][W]::GetWindowText($h, $tb, 512)
$cb = New-Object Text.StringBuilder 256
[void][W]::GetClassName($h, $cb, 256)
$pid2 = 0
[void][W]::GetWindowThreadProcessId($h, [ref]$pid2)
$exe = ''
try { $exe = (Get-Process -Id $pid2 -ErrorAction Stop).Path } catch {}
[pscustomobject]@{ title = $tb.ToString(); class = $cb.ToString(); exe = $exe } | ConvertTo-Json -Compress
`.trim()

let cache: WindowContext = { title: '', className: '', exe: '' }
let lastFetch = 0
const TTL_MS = 150

/**
 * Read the foreground window context. Cached for 150ms because PowerShell
 * spawn is ~50ms and we may query it on every keystroke.
 */
export function getActiveWindow(): Promise<WindowContext> {
  const now = Date.now()
  if (now - lastFetch < TTL_MS) return Promise.resolve(cache)
  lastFetch = now
  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', PS_SCRIPT],
      { windowsHide: true }
    )
    let out = ''
    child.stdout.on('data', (b) => (out += b.toString()))
    child.on('error', () => resolve(cache))
    child.on('exit', () => {
      try {
        const parsed = JSON.parse(out.trim())
        cache = {
          title: parsed.title ?? '',
          className: parsed.class ?? '',
          exe: parsed.exe ?? ''
        }
      } catch {
        /* keep previous cache */
      }
      resolve(cache)
    })
  })
}

/** Synchronous read of the last-known cache (used in hot paths). */
export function getLastActiveWindow(): WindowContext {
  return cache
}

/** Kick off a fetch without awaiting — keeps the cache warm. */
export function refreshActiveWindow(): void {
  void getActiveWindow()
}
