import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'

/**
 * --display=secondary puts the kiosk on the first non-primary monitor,
 * --display=<n> on the n-th monitor (1-based, screen.getAllDisplays order).
 * Without the flag the OS picks the primary display as usual.
 */
function pickDisplayOrigin(): { x?: number; y?: number } {
  const arg = process.argv.find((a) => a.startsWith('--display='))?.slice('--display='.length)
  if (!arg) return {}
  const displays = screen.getAllDisplays()
  const target =
    arg === 'secondary' ? displays.find((d) => d.id !== screen.getPrimaryDisplay().id) : displays[Number(arg) - 1]
  if (!target) return {}
  return { x: target.bounds.x, y: target.bounds.y }
}

export function createMainWindow(): BrowserWindow {
  const isDev = !!process.env['ELECTRON_RENDERER_URL']
  // Dev runs windowed by default; production runs kiosk fullscreen.
  // Override with --kiosk (force kiosk in dev) or --windowed (force windowed in prod).
  const windowed = process.argv.includes('--windowed') || (isDev && !process.argv.includes('--kiosk'))

  const win = new BrowserWindow({
    ...pickDisplayOrigin(),
    width: 1280,
    height: 800,
    show: false,
    fullscreen: !windowed,
    kiosk: !windowed,
    autoHideMenuBar: true,
    backgroundColor: '#F7F3EC',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())
  // Pinch-zoom on a touchscreen must not scale the kiosk UI
  win.webContents.setVisualZoomLevelLimits(1, 1)
  // Any external link goes to the system browser, never inside the kiosk
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}
