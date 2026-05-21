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

/**
 * Build an accelerator string from a MouseEvent. Returns null for buttons we
 * don't recognize.
 */
export function mouseEventToAccelerator(e: MouseEvent): string | null {
  const name = mouseButtonName(e.button)
  if (!name) return null
  return withMods(e, name)
}

/**
 * Build an accelerator string from a WheelEvent. Chooses the dominant axis
 * (vertical wins on a tie) and direction.
 */
export function wheelEventToAccelerator(e: WheelEvent): string | null {
  const ax = Math.abs(e.deltaX)
  const ay = Math.abs(e.deltaY)
  if (ax === 0 && ay === 0) return null
  const name =
    ay >= ax
      ? e.deltaY > 0
        ? 'WheelDown'
        : 'WheelUp'
      : e.deltaX > 0
        ? 'WheelRight'
        : 'WheelLeft'
  return withMods(e, name)
}

function mouseButtonName(button: number): string | null {
  switch (button) {
    case 0: return 'MouseLeft'
    case 1: return 'MouseMiddle'
    case 2: return 'MouseRight'
    case 3: return 'MouseX1'
    case 4: return 'MouseX2'
    default: return null
  }
}

function withMods(e: MouseEvent | WheelEvent, key: string): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Win')
  parts.push(key)
  return parts.join('+')
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
  Equal: '=',
  MouseLeft: 'Mouse L',
  MouseRight: 'Mouse R',
  MouseMiddle: 'Mouse M',
  MouseX1: 'Mouse X1',
  MouseX2: 'Mouse X2',
  WheelUp: 'Wheel ↑',
  WheelDown: 'Wheel ↓',
  WheelLeft: 'Wheel ←',
  WheelRight: 'Wheel →'
}

export function prettify(accelerator: string): string {
  if (!accelerator) return ''
  return accelerator
    .split('+')
    .map((p) => PRETTY[p] ?? p)
    .join(' + ')
}
