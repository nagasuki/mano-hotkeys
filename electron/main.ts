import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { store } from './store.js'
import { bindMacros, unbindAll } from './hotkeys.js'
import { runActions } from './actions.js'
import type { AppSettings, Macro, MacroAction } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 760,
    minHeight: 480,
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
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Open external links in the system browser, not inside Electron.
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

function buildTray(): void {
  // Minimal 16x16 placeholder; replace with a real icon later.
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Mano Hotkeys')
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
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
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) mainWindow.hide()
    else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function registerIpc(): void {
  ipcMain.handle('macros:list', () => store.getMacros())

  ipcMain.handle('macros:save', (_evt, macros: Macro[]) => {
    store.setMacros(macros)
    return bindMacros(macros)
  })

  ipcMain.handle('macros:test', async (_evt, actions: MacroAction[]) => {
    await runActions(actions)
  })

  ipcMain.handle('settings:get', () => store.getSettings())

  ipcMain.handle('settings:save', (_evt, settings: AppSettings) => {
    store.setSettings(settings)
    app.setLoginItemSettings({ openAtLogin: settings.launchOnLogin })
    return store.getSettings()
  })

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

    const macros = store.getMacros()
    bindMacros(macros)

    const { launchOnLogin } = store.getSettings()
    app.setLoginItemSettings({ openAtLogin: launchOnLogin })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else mainWindow?.show()
    })
  })

  app.on('window-all-closed', () => {
    // On Windows we keep running in the tray; quit only on macOS-style behavior
    // when the user explicitly quits.
    if (process.platform === 'darwin') return
  })

  app.on('will-quit', () => {
    unbindAll()
  })
}
