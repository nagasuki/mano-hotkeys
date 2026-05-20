import type { Hotstring } from '../types.js'

export interface HotstringMatch {
  hotstring: Hotstring
  /** Number of characters to delete (length of trigger + maybe terminator). */
  deleteCount: number
  /** Text to insert after deletion. */
  insert: string
}

const TERMINATORS = new Set([' ', '\t', '\n', '.', ',', ';', ':', '!', '?', "'", '"', ')'])

/**
 * Maintains a rolling character buffer of recently typed text and tests it
 * against the active hotstring list. Buffer is bounded to the longest
 * trigger plus a small margin to keep matching cheap.
 */
export class HotstringMatcher {
  private buffer = ''
  private maxLen = 64

  setHotstrings(list: Hotstring[]): void {
    const longest = list.reduce((m, h) => Math.max(m, h.trigger.length), 0)
    this.maxLen = Math.max(64, longest * 2 + 4)
    // Re-bound buffer if we shrank.
    if (this.buffer.length > this.maxLen) {
      this.buffer = this.buffer.slice(-this.maxLen)
    }
  }

  reset(): void {
    this.buffer = ''
  }

  /** Notify the buffer of a typed character. Returns a match if one fires. */
  onChar(ch: string, hotstrings: Hotstring[]): HotstringMatch | null {
    if (ch === '\b') {
      // Backspace shortens the buffer.
      this.buffer = this.buffer.slice(0, -1)
      return null
    }
    this.buffer += ch
    if (this.buffer.length > this.maxLen) {
      this.buffer = this.buffer.slice(-this.maxLen)
    }
    return this.tryMatch(ch, hotstrings)
  }

  private tryMatch(lastChar: string, hotstrings: Hotstring[]): HotstringMatch | null {
    const isTerm = TERMINATORS.has(lastChar)
    for (const h of hotstrings) {
      if (!h.enabled || !h.trigger) continue
      if (h.immediate) {
        const trigger = h.trigger
        if (matchesAtEnd(this.buffer, trigger, h.caseSensitive)) {
          return {
            hotstring: h,
            deleteCount: trigger.length,
            insert: h.replacement
          }
        }
      } else {
        // Terminator mode: trigger must be followed by a terminator char.
        if (!isTerm) continue
        const trigger = h.trigger
        // Buffer ends with trigger + lastChar (the terminator).
        const expected = trigger + lastChar
        if (matchesAtEnd(this.buffer, expected, h.caseSensitive)) {
          // Boundary check: the char before the trigger should not be alphanumeric
          // (so "btw" doesn't fire inside "abtw "). Skip if there's no char before.
          const beforeIdx = this.buffer.length - expected.length - 1
          if (beforeIdx >= 0) {
            const before = this.buffer[beforeIdx]
            if (/[a-zA-Z0-9_]/.test(before)) continue
          }
          return {
            hotstring: h,
            deleteCount: trigger.length + 1,
            insert: h.replacement + lastChar
          }
        }
      }
    }
    return null
  }
}

function matchesAtEnd(buffer: string, candidate: string, caseSensitive: boolean): boolean {
  if (buffer.length < candidate.length) return false
  const tail = buffer.slice(-candidate.length)
  return caseSensitive ? tail === candidate : tail.toLowerCase() === candidate.toLowerCase()
}
