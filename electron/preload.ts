/**
 * Quarry Electron Preload Script
 *
 * Exposes safe IPC methods to the renderer process.
 * Uses contextBridge to maintain security.
 *
 * @module electron/preload
 */

import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isDev: () => ipcRenderer.invoke('is-dev'),

  // Theme
  onThemeChange: (callback: (isDark: boolean) => void) => {
    ipcRenderer.on('theme-changed', (_event, isDark) => callback(isDark))
  },

  // Platform identification
  isElectron: true,
})

// TypeScript type augmentation for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      isDev: () => Promise<boolean>
      onThemeChange: (callback: (isDark: boolean) => void) => void
      isElectron: boolean
    }
  }
}
