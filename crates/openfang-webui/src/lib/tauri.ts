import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

// Tauri port state
let tauriPort: number | null = null

/**
 * Detect if running inside Tauri desktop app
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__
}

/**
 * Get the embedded API server port from Tauri
 * In Tauri desktop app, the server runs on a dynamic port
 */
export async function getApiPort(): Promise<number> {
  // Return cached port
  if (tauriPort !== null) {
    return tauriPort
  }

  // Try to get port from Tauri command (will fail silently if not in Tauri)
  try {
    const port = await invoke<number>('get_port')
    tauriPort = port
    console.log('[Tauri] Got port from command:', port)
    return port
  } catch {
    // Not in Tauri or command failed, use default
  }

  // Fallback to default port 4200
  console.log('[Tauri] Using default port 4200')
  return 4200
}

/**
 * Get the base URL for API requests
 * In Tauri: http://127.0.0.1:{dynamic_port}
 * In browser dev: uses Vite proxy (relative URL)
 */
export async function getApiBaseUrl(): Promise<string> {
  const port = await getApiPort()
  // Always use full URL in production/Tauri
  if (port !== 4200 || isTauri()) {
    return `http://127.0.0.1:${port}`
  }
  // In dev mode with Vite proxy, use relative URL
  return ''
}

/**
 * Get WebSocket base URL
 */
export async function getWsBaseUrl(): Promise<string> {
  const port = await getApiPort()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//127.0.0.1:${port}`
}

/**
 * Reset cached port (for testing)
 */
export function resetApiPort(): void {
  tauriPort = null
}

/**
 * Toggle fullscreen mode for the current Tauri window
 * Returns the new fullscreen state
 */
export async function toggleFullscreen(): Promise<boolean> {
  console.log('[Fullscreen] Toggle called, isTauri:', isTauri())

  // If in Tauri, use Tauri window API exclusively
  if (isTauri()) {
    try {
      const window = getCurrentWindow()
      console.log('[Fullscreen] Got current window:', window)
      const fs = await window.isFullscreen()
      console.log('[Fullscreen] Current state:', fs)
      await window.setFullscreen(!fs)
      console.log('[Fullscreen] Set to:', !fs)
      return !fs
    } catch (error) {
      console.error('[Fullscreen] Tauri API failed:', error)
      // Don't fall through - Tauri should work, if it doesn't we need to know
      throw error
    }
  }

  // Browser fallback - only used outside Tauri
  console.log('[Fullscreen] Using browser API')
  const getRequestFullscreenMethod = (element: HTMLElement) => {
    const method =
      element.requestFullscreen ||
      (element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ||
      (element as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen ||
      (element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen
    return method?.bind(element)
  }

  const getExitFullscreenMethod = () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>
      mozCancelFullScreen?: () => Promise<void>
      msExitFullscreen?: () => Promise<void>
    }
    return doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen
  }

  const getFullscreenElement = () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element
      mozFullScreenElement?: Element
      msFullscreenElement?: Element
    }
    return doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement
  }

  const currentFsElement = getFullscreenElement()
  if (!currentFsElement) {
    const requestFs = getRequestFullscreenMethod(document.documentElement)
    if (requestFs) {
      try {
        await requestFs()
        return true
      } catch (e) {
        console.error('[Fullscreen] Failed to enter fullscreen:', e)
      }
    }
  } else {
    const exitFs = getExitFullscreenMethod()
    if (exitFs) {
      try {
        await exitFs.call(document)
        return false
      } catch (e) {
        console.error('[Fullscreen] Failed to exit fullscreen:', e)
      }
    }
  }

  console.warn('[Fullscreen] Fullscreen API not supported')
  return !!currentFsElement
}

/**
 * Check if currently in fullscreen mode
 */
export async function isFullscreen(): Promise<boolean> {
  if (isTauri()) {
    try {
      const window = getCurrentWindow()
      return await window.isFullscreen()
    } catch (error) {
      console.error('[Fullscreen] isFullscreen check failed:', error)
      return false
    }
  }

  const doc = document as Document & {
    webkitFullscreenElement?: Element
    mozFullScreenElement?: Element
    msFullscreenElement?: Element
  }
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)
}
