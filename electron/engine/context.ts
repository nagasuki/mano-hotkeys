import type { AppContext, WindowContext } from '../types.js'

/** Does the given app-context allow the macro to fire for this window? */
export function contextAllows(ctx: AppContext, win: WindowContext): boolean {
  if (!ctx.rules || ctx.rules.length === 0) return true
  const any = ctx.rules.some((rule) => {
    const target = rule.field === 'title' ? win.title : rule.field === 'class' ? win.className : win.exe
    const a = rule.caseSensitive ? target : target.toLowerCase()
    const b = rule.caseSensitive ? rule.value : rule.value.toLowerCase()
    switch (rule.op) {
      case 'contains':
        return a.includes(b)
      case 'equals':
        return a === b
      case 'regex':
        try {
          return new RegExp(rule.value, rule.caseSensitive ? '' : 'i').test(target)
        } catch {
          return false
        }
    }
  })
  return ctx.negate ? !any : any
}
