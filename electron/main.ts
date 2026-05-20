import { app, BrowserWindow, ipcMain, Menu, nativeImage, shell, Tray } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { store } from './store.js'
import { InputEngine } from './engine/input.js'
import { expandHotstring, runActions } from './actions.js'
import { getActiveWindow } from './engine/active-window.js'
import { sendKeys } from './output/keyboard.js'
import type { AppSettings, BindResult, EngineStatus, Hotstring, Macro, MacroAction, Remap } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let engine: InputEngine | null = null
let macroFailedIds: string[] = []
let remapFailedIds: string[] = []

function pushStatus(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const s = store.getSettings()
  const status: EngineStatus = {
    hookActive: !!engine?.isStarted(),
    suspended: s.suspended,
    hotkeyCount: store.getMacros().filter((m) => m.enabled && m.accelerator).length,
    hotstringCount: store.getHotstrings().filter((h) => h.enabled).length,
    remapCount: store.getRemaps().filter((r) => r.enabled).length,
    uptimeMs: engine?.uptimeMs() ?? 0
  }
  mainWindow.webContents.send('engine:update', status)
  updateTrayMenu()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 880,
    minHeight: 540,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0d',
    title: 'Mano Hotkeys',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0a0a0d', symbolColor: '#d8d8de', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    const { startMinimized } = store.getSettings()
    if (!startMinimized) mainWindow?.show()
    pushStatus()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function updateTrayMenu(): void {
  if (!tray) return
  const settings = store.getSettings()
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show Mano Hotkeys',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: settings.suspended ? '▶  Resume hotkeys' : '⏸  Suspend hotkeys',
      click: () => setSuspended(!settings.suspended)
    },
    {
      label: `Engine: ${engine?.isStarted() ? 'running' : 'stopped'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(`Mano Hotkeys ${settings.suspended ? '(suspended)' : ''}`)
}

function buildTray(): void {
  // 16x16 placeholder. Replace with a real icon in /resources later.
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) mainWindow.hide()
    else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  updateTrayMenu()
}

function setSuspended(v: boolean): void {
  const s = store.getSettings()
  store.setSettings({ ...s, suspended: v })
  engine?.setSuspended(v)
  pushStatus()
}

function rebindEverything(): void {
  if (!engine) return
  macroFailedIds = engine.setMacros(store.getMacros())
  remapFailedIds = engine.setRemaps(store.getRemaps())
  engine.setHotstrings(store.getHotstrings())
  engine.setSuspendAccelerator(store.getSettings().suspendAccelerator)
  pushStatus()
}

function startEngine(): void {
  engine = new InputEngine({
    onMacroTrigger: (macro: Macro) => {
      void runActions(macro.actions)
    },
    onHotstringFire: (match) => {
      void expandHotstring(match.deleteCount, match.insert)
    },
    onRemapFire: (remap: Remap) => {
      // Best-effort remap: send the target accelerator. The source key still
      // reaches the focused app because uiohook-napi can't suppress events.
      sendKeys(remap.to).catch(() => {})
    },
    onSuspendToggle: () => setSuspended(!store.getSettings().suspended)
  })
  engine.start()
  engine.setSuspended(store.getSettings().suspended)
  rebindEverything()
}

function registerIpc(): void {
  ipcMain.handle('macros:list', () => store.getMacros())

  ipcMain.handle('macros:save', (_e, macros: Macro[]): BindResult => {
    store.setMacros(macros)
    macroFailedIds = engine?.setMacros(macros) ?? []
    pushStatus()
    return { ok: macroFailedIds.length === 0, failed: macroFailedIds }
  })

  ipcMain.handle('macros:test', async (_e, actions: MacroAction[]) => {
    await runActions(actions)
  })

  ipcMain.handle('hotstrings:list', () => store.getHotstrings())

  ipcMain.handle('hotstrings:save', (_e, hotstrings: Hotstring[]): BindResult => {
    store.setHotstrings(hotstrings)
    engine?.setHotstrings(hotstrings)
    pushStatus()
    return { ok: true, failed: [] }
  })

  ipcMain.handle('remaps:list', () => store.getRemaps())

  ipcMain.handle('remaps:save', (_e, remaps: Remap[]): BindResult => {
    store.setRemaps(remaps)
    remapFailedIds = engine?.setRemaps(remaps) ?? []
    pushStatus()
    return { ok: remapFailedIds.length === 0, failed: remapFailedIds }
  })

  ipcMain.handle('settings:get', () => store.getSettings())

  ipcMain.handle('settings:save', (_e, settings: AppSettings): AppSettings => {
    store.setSettings(settings)
    app.setLoginItemSettings({ openAtLogin: settings.launchOnLogin })
    engine?.setSuspendAccelerator(settings.suspendAccelerator)
    engine?.setSuspended(settings.suspended)
    pushStatus()
    return store.getSettings()
  })

  ipcMain.handle('engine:status', (): EngineStatus => {
    return {
      hookActive: !!engine?.isStarted(),
      suspended: store.getSettings().suspended,
      hotkeyCount: store.getMacros().filter((m) => m.enabled && m.accelerator).length,
      hotstringCount: store.getHotstrings().filter((h) => h.enabled).length,
      remapCount: store.getRemaps().filter((r) => r.enabled).length,
      uptimeMs: engine?.uptimeMs() ?? 0
    }
  })

  ipcMain.handle('engine:suspend', (_e, v: boolean) => {
    setSuspended(v)
    return store.getSettings()
  })

  ipcMain.handle('engine:active-window', async () => await getActiveWindow())

  ipcMain.handle('app:quit', () => {
    isQuitting = true
    app.quit()
  })

  ipcMain.handle('app:hide', () => mainWindow?.hide())
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    registerIpc()
    createWindow()
    buildTray()
    startEngine()
    app.setLoginItemSettings({ openAtLogin: store.getSettings().launchOnLogin })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else mainWindow?.show()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin') return
  })

  app.on('will-quit', () => {
    engine?.stop()
  })
}
