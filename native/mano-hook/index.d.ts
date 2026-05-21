// Native low-level keyboard + mouse hook with synchronous suppression.

// Modifier mask bits:
export const MOD_CTRL: 1
export const MOD_ALT: 2
export const MOD_SHIFT: 4
export const MOD_WIN: 8

// Mouse pseudo-VKs (outside the 8-bit Windows VK space).
export const MVK_LEFT: 0x201
export const MVK_RIGHT: 0x202
export const MVK_MIDDLE: 0x203
export const MVK_X1: 0x204
export const MVK_X2: 0x205
export const MVK_WHEEL_UP: 0x210
export const MVK_WHEEL_DOWN: 0x211
export const MVK_WHEEL_LEFT: 0x212
export const MVK_WHEEL_RIGHT: 0x213

export interface KeyEvent {
  kind: 'key'
  vk: number
  mods: number
  up: boolean
  suppressed: boolean
  ruleId?: string
}

export interface MouseButtonEvent {
  kind: 'mouseButton'
  /** One of MVK_LEFT / MVK_RIGHT / MVK_MIDDLE / MVK_X1 / MVK_X2 */
  vk: number
  mods: number
  up: boolean
  suppressed: boolean
  x: number
  y: number
  ruleId?: string
}

export interface MouseWheelEvent {
  kind: 'wheel'
  /** One of MVK_WHEEL_UP / DOWN / LEFT / RIGHT */
  vk: number
  mods: number
  up: false
  suppressed: boolean
  x: number
  y: number
  /** Raw signed delta (typically ±120 per notch). */
  wheelDelta: number
  ruleId?: string
}

export type NativeEvent = KeyEvent | MouseButtonEvent | MouseWheelEvent

export interface RulesetEntry {
  id: string
  /** Windows VK for keys, or one of MVK_* for mouse buttons/wheel. */
  vk: number
  /** Required modifier mask. Use 0 for "no modifiers". */
  mods: number
  kind: 'hotkey' | 'remap'
}

export interface Ruleset {
  entries: RulesetEntry[]
  suspended: boolean
}

export type EventCallback = (e: NativeEvent) => void

export function start(cb: EventCallback): void
export function stop(): void
export function isRunning(): boolean
export function setRuleset(rules: Ruleset): void

export interface SynthStep {
  vk: number
  down: boolean
}
export function sendInput(steps: SynthStep[]): void
export function tap(vk: number): void
export function isKeyDown(vk: number): boolean

export type MouseSynthStep =
  | { kind: 'button'; vk: number; down: boolean }
  | { kind: 'wheel'; vk: number }
  | { kind: 'move'; x: number; y: number; absolute?: boolean }

export function sendMouseInput(steps: MouseSynthStep[]): void
