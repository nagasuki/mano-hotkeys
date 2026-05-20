import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, BindResult, Macro, MacroAction } from './types.js'

const api = {
  listMacros: (): Promise<Macro[]> => ipcRenderer.invoke('macros:list'),
  saveMacros: (macros: Macro[]): Promise<BindResult> =>
    ipcRenderer.invoke('macros:save', macros),
  testActions: (actions: MacroAction[]): Promise<void> =>
    ipcRenderer.invoke('macros:test', actions),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', settings),

  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
  minimizeToTray: (): Promise<void> => ipcRenderer.invoke('app:hide')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
