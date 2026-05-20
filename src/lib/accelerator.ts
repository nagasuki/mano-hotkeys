/**
 * Convert a KeyboardEvent into our canonical accelerator string.
 * Modifier order: Ctrl, Alt, Shift, Win, then key. Returns null when only
 * modifiers are pressed.
 */
export function eventToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Win')

  const key = mapKey(e)
  if (!key) return null
  parts.push(key)
  if (parts.every(isModifier)) return null
  return parts.join('+')
}

function isModifier(part: string): boolean {
  return part === 'Ctrl' || part === 'Alt' || part === 'Shift' || part === 'Win'
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
  Enter: 'Enter',
  Space: 'Space',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Minus: 'Minus',
  Equal: 'Equal',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight',
  Backslash: 'Backslash',
  Semicolon: 'Semicolon',
  Quote: 'Quote',
  Comma: 'Comma',
  Period: 'Period',
  Slash: 'Slash',
  Backquote: 'Backquote',
  Pause: 'Pause',
  CapsLock: 'CapsLock'
}

function mapKey(e: KeyboardEvent): string | null {
  const code = e.code
  if (!code) return null
  if (
    code === 'ControlLeft' || code === 'ControlRight' ||
    code === 'ShiftLeft' || code === 'ShiftRight' ||
    code === 'AltLeft' || code === 'AltRight' ||
    code === 'MetaLeft' || code === 'MetaRight' ||
    code === 'OSLeft' || code === 'OSRight'
  ) {
    return null
  }
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) {
    const rest = code.slice(6)
    if (/^\d$/.test(rest)) return `Numpad${rest}`
    const map: Record<string, string> = {
      Add: 'NumpadAdd',
      Subtract: 'NumpadSubtract',
      Multiply: 'NumpadMultiply',
      Divide: 'NumpadDivide',
      Decimal: 'NumpadDecimal',
      Enter: 'NumpadEnter'
    }
    return map[rest] ?? null
  }
  if (/^F\d{1,2}$/.test(code)) return code
  return CODE_MAP[code] ?? null
}

const PRETTY: Record<string, string> = {
  Backquote: '`',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Minus: '-',
  Equal: '='
}

export function prettify(accelerator: string): string {
  if (!accelerator) return ''
  return accelerator
    .split('+')
    .map((p) => PRETTY[p] ?? p)
    .join(' + ')
}
