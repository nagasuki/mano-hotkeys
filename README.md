# Mano Hotkeys

A keyboard macro and automation app for Windows — native input engine, clean UI, no scripting required.

> Inspired by AutoHotkey, but built around a visual editor instead of a DSL. Not yet at full AHK parity (image search, COM, expression scripting, etc. are out of scope for now), but covers the day-to-day 80%: global hotkeys, hotstrings, key remaps, app-context filters, mouse + window automation.

## Stack

- **Electron 33** + **electron-vite** — desktop shell with HMR in dev
- **React 18** + **TypeScript** + **Tailwind CSS** — minimal dark UI
- **uiohook-napi** — low-level global keyboard + mouse hook (native, prebuilt for win32-x64)
- **PowerShell + Win32 PInvoke** — mouse output, window management, active-window detection

## Feature surface

### Macros (global hotkeys)
- Bind any modifier+key combo, including **Win-key combos** (uiohook captures these where `Electron.globalShortcut` cannot)
- Action sequencing with per-action delay
- Live test from the editor

### Hotstrings
- Text expansion: type `btw` → `by the way`
- Modes: terminator-based (default) or immediate
- Match case toggle, reset-on-backspace
- Per-app context (only fire in certain windows)

### Key remaps
- Single-key remaps (e.g. CapsLock → Esc, F13 → Win+L)
- Honest caveat: uiohook-napi can't suppress the original key, so source keys should be ones you can dedicate (F-keys, CapsLock, NumLock, etc.).

### App-context filters
- Limit any macro or hotstring to specific windows
- Match on title / class / exe with contains / equals / regex; negatable

### Action types
- **Apps & files** — launch executable, open file, open URL, run shell command
- **Keyboard** — type text, paste text (preserves clipboard), send raw accelerator
- **Mouse** — move (absolute or relative), click (1-N), scroll
- **Windows** — focus, close, minimize (by title-contains or active)
- **Clipboard** — set, clear
- **Flow** — sleep, notify

### UX
- Tabbed surface (Macros / Hotstrings / Remaps / Settings)
- **Ctrl+K command palette** — jump to any entry or run a quick action
- System tray with show / hide / suspend / quit
- Single-instance lock
- Global **suspend** toggle (default `Ctrl+Alt+Pause`, configurable)
- Live engine status in the titlebar

## Scripts

```sh
npm install
npm run dev        # electron-vite dev with HMR
npm run build      # bundles main, preload, renderer into ./out
npm run dist       # builds a Windows installer into ./release
npm run typecheck  # tsc --noEmit (main + renderer projects)
```

## Layout

```
electron/
  main.ts                  app lifecycle, IPC, tray
  preload.ts               window.api context bridge
  actions.ts               action runner + hotstring expansion
  store.ts                 JSON persistence (userData/mano-hotkeys.json)
  types.ts                 shared types (mirrored in src/types.ts)
  engine/
    input.ts               central input engine (uiohook subscriber + router)
    keymap.ts              canonical key names ↔ uiohook keycodes ↔ printable chars
    matcher.ts             accelerator parse + match
    hotstrings.ts          rolling buffer & expansion matcher
    active-window.ts       foreground window detection (PowerShell, cached)
    context.ts             AppContext rule evaluator
  output/
    keyboard.ts            keystroke synthesis (uiohook keyTap/keyToggle)
    win32.ts               mouse + window ops via PowerShell PInvoke

src/
  App.tsx                  shell + tabs + palette wiring
  state/store.ts           renderer-side store hook (loads, debounces, syncs)
  components/
    Titlebar.tsx           drag region + live status pill
    Tabs.tsx               top-level tab strip
    CommandPalette.tsx     Ctrl+K palette
    HotkeyCapture.tsx      click-to-record accelerator input
    Icons.tsx              inline SVG icons
    common/                ListSidebar, Toggle, EmptyPane
    macros/                MacrosPane, MacroEditor, ActionList, AppContextEditor
    hotstrings/            HotstringsPane, HotstringEditor
    remaps/                RemapsPane
    settings/              SettingsPane
  lib/accelerator.ts       KeyboardEvent → canonical accelerator
```

## Known limits & roadmap

- **No input suppression.** uiohook-napi is a passive listener; remaps and macro hotkeys do not block the original keystroke from reaching the focused app. Pick accelerators that aren't claimed by the foreground app.
- **No image / pixel actions yet.** Screen capture and pixel search are AHK strengths we haven't matched.
- **No expression language.** Actions are a flat sequence — no if/while/variables yet (planned: a small expression grammar over clipboard, active-window fields, and mouse position).
- **No macro recorder yet.** Planned: a record-and-edit flow that captures key + mouse events with timing.
- **Single-key remap only.** Modifier-bearing source remaps need true interception.

## Hotkey examples

| Goal | Accelerator |
| --- | --- |
| Open task manager | `Ctrl+Shift+Esc` |
| Toggle desktop | `Win+D` |
| Paste cleaned-up text | `Ctrl+Shift+V` |
| Launch app | `Ctrl+Alt+1` |
| F-key shortcut | `F13` …  `F24` |

## Data

All state is persisted as JSON in `%APPDATA%/mano-hotkeys/mano-hotkeys.json`. Safe to back up or edit by hand.
