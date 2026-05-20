import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  BindResult,
  EngineStatus,
  Hotstring,
  Macro,
  MacroAction,
  Remap,
  WindowContext
} from './types.js'

const api = {
  // Macros
  listMacros: (): Promise<Macro[]> => ipcRenderer.invoke('macros:list'),
  saveMacros: (m: Macro[]): Promise<BindResult> => ipcRenderer.invoke('macros:save', m),
  testActions: (actions: MacroAction[]): Promise<void> => ipcRenderer.invoke('macros:test', actions),

  // Hotstrings
  listHotstrings: (): Promise<Hotstring[]> => ipcRenderer.invoke('hotstrings:list'),
  saveHotstrings: (h: Hotstring[]): Promise<BindResult> => ipcRenderer.invoke('hotstrings:save', h),

  // Remaps
  listRemaps: (): Promise<Remap[]> => ipcRenderer.invoke('remaps:list'),
  saveRemaps: (r: Remap[]): Promise<BindResult> => ipcRenderer.invoke('remaps:save', r),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: AppSettings): Promise<AppSettings> => ipcRenderer.invoke('settings:save', s),

  // Engine
  engineStatus: (): Promise<EngineStatus> => ipcRenderer.invoke('engine:status'),
  setSuspended: (v: boolean): Promise<AppSettings> => ipcRenderer.invoke('engine:suspend', v),
  getActiveWindow: (): Promise<WindowContext> => ipcRenderer.invoke('engine:active-window'),

  // App
  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
  minimizeToTray: (): Promise<void> => ipcRenderer.invoke('app:hide'),

  // Live updates pushed from main
  onEngineUpdate: (cb: (status: EngineStatus) => void) => {
    const listener = (_: unknown, status: EngineStatus) => cb(status)
    ipcRenderer.on('engine:update', listener)
    return () => ipcRenderer.removeListener('engine:update', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
