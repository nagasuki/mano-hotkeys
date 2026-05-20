/**
 * Convert a KeyboardEvent into an Electron accelerator string.
 * Returns null when only modifiers are pressed.
 *
 * @see https://www.electronjs.org/docs/latest/api/accelerator
 */
export function eventToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Super')

  const key = mapKey(e)
  if (!key) return null
  parts.push(key)
  // Reject if no non-modifier key was captured.
  if (parts.length === 0) return null
  if (parts.every(isModifier)) return null
  return parts.join('+')
}

function isModifier(part: string): boolean {
  return part === 'Ctrl' || part === 'Alt' || part === 'Shift' || part === 'Super' || part === 'Cmd'
}

const CODE_MAP: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Tab: 'Tab',
  Enter: 'Return',
  Space: 'Space',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`'
}

function mapKey(e: KeyboardEvent): string | null {
  const code = e.code
  if (!code) return null
  // Modifier keys alone are ignored by the caller; we still skip them here.
  if (
    code === 'ControlLeft' ||
    code === 'ControlRight' ||
    code === 'ShiftLeft' ||
    code === 'ShiftRight' ||
    code === 'AltLeft' ||
    code === 'AltRight' ||
    code === 'MetaLeft' ||
    code === 'MetaRight' ||
    code === 'OSLeft' ||
    code === 'OSRight'
  ) {
    return null
  }
  if (code.startsWith('Key')) return code.slice(3) // KeyA → A
  if (code.startsWith('Digit')) return code.slice(5) // Digit1 → 1
  if (code.startsWith('Numpad')) {
    const rest = code.slice(6)
    if (/^\d$/.test(rest)) return `num${rest}`
    const map: Record<string, string> = {
      Add: 'numadd',
      Subtract: 'numsub',
      Multiply: 'nummult',
      Divide: 'numdiv',
      Decimal: 'numdec',
      Enter: 'Return'
    }
    return map[rest] ?? null
  }
  if (/^F\d{1,2}$/.test(code)) return code // F1..F24
  return CODE_MAP[code] ?? null
}

/** Pretty-print an accelerator for the UI. */
export function prettify(accelerator: string): string {
  if (!accelerator) return ''
  return accelerator
    .split('+')
    .map((p) => {
      if (p === 'CommandOrControl' || p === 'CmdOrCtrl') return 'Ctrl'
      if (p === 'Super' || p === 'Meta') return 'Win'
      return p
    })
    .join(' + ')
}
