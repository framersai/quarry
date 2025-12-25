/**
 * Quarry Electron Main Process
 *
 * Opens directly to the Codex viewer for knowledge management.
 * Community edition - premium features require license upgrade.
 *
 * @module electron/main
 */

import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron'
import * as path from 'path'
import * as url from 'url'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Quarry',
    titleBarStyle: 'hiddenInset', // macOS native title bar
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false, // Don't show until ready
  })

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (isDev) {
    // Development: load from Next.js dev server
    mainWindow.loadURL('http://localhost:3000/codex')

    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools()
  } else {
    // Production: load from static export
    const startUrl = url.format({
      pathname: path.join(__dirname, '../out/codex/index.html'),
      protocol: 'file:',
      slashes: true,
    })
    mainWindow.loadURL(startUrl)
  }

  // Handle external links - open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow internal navigation
    if (url.startsWith('file://') || url.includes('localhost:3000')) {
      return { action: 'allow' }
    }
    // Open external links in system browser
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    // Allow local navigation
    if (parsedUrl.protocol === 'file:' || parsedUrl.hostname === 'localhost') {
      return
    }

    // Open external URLs in system browser
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })

  // Cleanup on close
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  // macOS: Re-create window when dock icon clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('is-dev', () => {
  return isDev
})

// Handle theme changes
nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors)
})
