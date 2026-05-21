# mano-hook

Low-level Windows keyboard hook with native-side suppression. C++ N-API addon used by Mano Hotkeys.

## What it does
- Owns a `WH_KEYBOARD_LL` hook on a dedicated thread with its own Win32 message pump.
- Decides synchronously whether to swallow each event based on a ruleset cached in native memory (mutex-guarded). Decisions are O(rules) over a small list.
- Dispatches events to JS asynchronously via `napi_threadsafe_function`. JS never blocks the hook callback (avoids tripping `LowLevelHooksTimeout`).
- Provides `SendInput`-based output tagged with a magic `dwExtraInfo` (`0xCA11BACC`) so the hook ignores its own synthesized input — no feedback loops with remaps.

## API
See `index.d.ts`.

```ts
import hook from 'mano-hook'

hook.start((e) => { /* { vk, mods, up, suppressed, ruleId? } */ })
hook.setRuleset({
  entries: [{ id: 'macro:42', vk: 0x50, mods: hook.MOD_CTRL | hook.MOD_SHIFT, kind: 'hotkey' }],
  suspended: false
})
hook.sendInput([{ vk: 0x11, down: true }, { vk: 0x43, down: true }, { vk: 0x43, down: false }, { vk: 0x11, down: false }])
hook.stop()
```

## Build

```sh
# from the repo root
npm install                  # installs JS deps only (skips the native build)
npm run rebuild:native       # compiles the addon
```

Requires:
- Python 3.x
- **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload.
  - Download: <https://aka.ms/vs/17/release/vs_BuildTools.exe>
  - `node-gyp` v11 only recognizes VS versions 15 (2017), 16 (2019), and 17 (2022). VS 2026 (version 18) is **not** supported yet, even with the right `GYP_MSVS_*` env vars or running from its Developer Command Prompt — node-gyp fails the `findVS` check with "unknown version 'undefined'". Install VS 2022 Build Tools side-by-side; the two coexist fine.
- Node ≥ 18

After installing VS 2022 Build Tools:

```sh
npm config set msvs_version 2022
cd <repo root>
npm run rebuild:native
```

If you keep multiple VS installs and want to be explicit, run the build from the **"x64 Native Tools Command Prompt for VS 2022"** shortcut.

The build emits `build/Release/mano_hook.node`, which `node-gyp-build` loads at runtime.

## Distribution

The Linux CI workflow (`.github/workflows/build-msi.yml`) packages the MSI under Wine and **cannot compile this addon** — Linux has no MSVC. The repo therefore ships a prebuilt Windows binary under `prebuilds/win32-x64/`, produced by [`prebuildify`](https://github.com/prebuild/prebuildify) and picked up at runtime by `node-gyp-build`.

### Refreshing the prebuilt binary

On a **Windows machine** with Visual Studio 2019/2022 Build Tools installed:

```sh
cd native/mano-hook
npm ci
npm run prebuild
git add prebuilds/
git commit -m "mano-hook: refresh win32-x64 prebuilt"
```

`prebuildify --napi` produces an ABI-stable Node-API binary that loads in both Node and Electron without rebuilding. Refresh it whenever you change `src/addon.cc`, bump `NAPI_VERSION` in `binding.gyp`, or want to support a new arch (`--arch arm64` etc.).

If the CI step "Verify Windows prebuilt addon is present" fails, you forgot this step.
