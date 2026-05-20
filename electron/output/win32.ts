import { spawn } from 'node:child_process'

/**
 * Wrapper around a single PowerShell invocation that loads a C# type with
 * all the Win32 PInvoke wrappers we need for mouse and window output.
 *
 * Each call spawns a fresh powershell.exe (overhead ~80–150ms). For a
 * future optimisation we could keep a persistent shell open and pipe
 * commands over stdin.
 */
const TYPE_DEF = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class M {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, int data, IntPtr extra);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
}
public class W {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c, string n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int t, bool r);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint Msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
}
"@ -ErrorAction SilentlyContinue
`.trim()

function runPS(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const full = `${TYPE_DEF}\n${script}`
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', full],
      { windowsHide: true }
    )
    let out = ''
    let err = ''
    child.stdout.on('data', (b) => (out += b.toString()))
    child.stderr.on('data', (b) => (err += b.toString()))
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(err.trim() || `powershell exited ${code}`))
    })
  })
}

// ── Mouse ───────────────────────────────────────────────────────────────────

const MOUSE_FLAGS = {
  LEFTDOWN: 0x0002,
  LEFTUP: 0x0004,
  RIGHTDOWN: 0x0008,
  RIGHTUP: 0x0010,
  MIDDLEDOWN: 0x0020,
  MIDDLEUP: 0x0040,
  WHEEL: 0x0800
} as const

export async function mouseMove(x: number, y: number, relative = false): Promise<void> {
  if (relative) {
    await runPS(
      `$p = New-Object M+POINT; [void][M]::GetCursorPos([ref]$p); [void][M]::SetCursorPos($p.X + ${x}, $p.Y + ${y})`
    )
  } else {
    await runPS(`[void][M]::SetCursorPos(${x}, ${y})`)
  }
}

export async function mouseClick(button: 'left' | 'right' | 'middle', count = 1): Promise<void> {
  const down = button === 'left' ? MOUSE_FLAGS.LEFTDOWN : button === 'right' ? MOUSE_FLAGS.RIGHTDOWN : MOUSE_FLAGS.MIDDLEDOWN
  const up = button === 'left' ? MOUSE_FLAGS.LEFTUP : button === 'right' ? MOUSE_FLAGS.RIGHTUP : MOUSE_FLAGS.MIDDLEUP
  const lines: string[] = []
  for (let i = 0; i < count; i++) {
    lines.push(`[M]::mouse_event(${down}, 0, 0, 0, [IntPtr]::Zero)`)
    lines.push(`[M]::mouse_event(${up}, 0, 0, 0, [IntPtr]::Zero)`)
  }
  await runPS(lines.join('; '))
}

export async function mouseScroll(amount: number): Promise<void> {
  const ticks = amount * 120 // WHEEL_DELTA
  await runPS(`[M]::mouse_event(${MOUSE_FLAGS.WHEEL}, 0, 0, ${ticks}, [IntPtr]::Zero)`)
}

// ── Window ──────────────────────────────────────────────────────────────────

const SHOW = {
  Minimize: 6,
  Restore: 9,
  Maximize: 3
} as const

const WM_CLOSE = 0x0010

function findHwndScript(titleContains: string): string {
  // Search visible top-level windows whose title contains the given string.
  // Returns the first match as an integer; 0 if none.
  const safe = titleContains.replace(/'/g, "''")
  return `
$found = [IntPtr]::Zero
$needle = '${safe}'
$cb = [W+EnumProc]{
  param($h, $l)
  if (-not [W]::IsWindowVisible($h)) { return $true }
  $len = [W]::GetWindowTextLength($h)
  if ($len -le 0) { return $true }
  $sb = New-Object Text.StringBuilder ($len + 1)
  [void][W]::GetWindowText($h, $sb, $sb.Capacity)
  $title = $sb.ToString()
  if ($title -and $title.ToLower().Contains($needle.ToLower())) {
    $script:found = $h
    return $false
  }
  return $true
}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
$script:found.ToInt64()
`.trim()
}

export async function focusWindow(titleContains: string): Promise<boolean> {
  const out = await runPS(`${findHwndScript(titleContains)}\n`)
  const hwnd = Number(out.trim())
  if (!hwnd) return false
  await runPS(`[void][W]::ShowWindow([IntPtr]${hwnd}, ${SHOW.Restore}); [void][W]::SetForegroundWindow([IntPtr]${hwnd})`)
  return true
}

export async function closeWindow(titleContains: string): Promise<boolean> {
  const script = titleContains
    ? `${findHwndScript(titleContains)}`
    : `[W]::GetForegroundWindow().ToInt64()`
  const out = await runPS(script)
  const hwnd = Number(out.trim())
  if (!hwnd) return false
  await runPS(`[void][W]::PostMessage([IntPtr]${hwnd}, ${WM_CLOSE}, [IntPtr]::Zero, [IntPtr]::Zero)`)
  return true
}

export async function minimizeWindow(titleContains: string): Promise<boolean> {
  const script = titleContains
    ? `${findHwndScript(titleContains)}`
    : `[W]::GetForegroundWindow().ToInt64()`
  const out = await runPS(script)
  const hwnd = Number(out.trim())
  if (!hwnd) return false
  await runPS(`[void][W]::ShowWindow([IntPtr]${hwnd}, ${SHOW.Minimize})`)
  return true
}
