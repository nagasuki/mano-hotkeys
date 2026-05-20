# Mano Hotkeys

Minimal, clean keyboard macro and hotkey manager for Windows.

## Stack

- **Electron** + **electron-vite** — desktop shell, hot reload in dev
- **React 18** + **TypeScript** + **Tailwind CSS** — minimal dark UI
- **PowerShell SendKeys** — keystroke synthesis (no native modules to compile)

## Features

- Global hotkeys bound to a sequence of actions
- Actions: launch app/file, open URL, run shell command, type text, paste text, send keys (SendKeys syntax), system notification
- Per-action delay
- Test runner (run the macro without leaving the editor)
- System tray with show/hide/quit
- Single-instance lock — re-launching focuses the running window
- Auto-saves to `%APPDATA%/mano-hotkeys/mano-hotkeys.json`

## Scripts

```sh
npm install
npm run dev        # launches Electron + Vite with HMR
npm run build      # builds main, preload, and renderer into ./out
npm run dist       # builds a Windows installer into ./release
npm run typecheck  # tsc --noEmit for both main and renderer
```

## Layout

```
electron/        Main + preload + hotkey runtime
src/             React renderer
  components/    UI building blocks (Sidebar, MacroEditor, ActionList, …)
  lib/           Pure helpers (accelerator capture)
```

## SendKeys syntax cheatsheet

| Key combo  | SendKeys |
| ---------- | -------- |
| Ctrl+C     | `^c`     |
| Alt+F4     | `%{F4}`  |
| Shift+Tab  | `+{TAB}` |
| Win+R      | `^({ESC})` (workaround — Win key isn't directly supported) |
| Enter      | `{ENTER}` |
| Type "Hi"  | `Hi`     |

For the full grammar see Microsoft's [SendKeys documentation](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.sendkeys).
