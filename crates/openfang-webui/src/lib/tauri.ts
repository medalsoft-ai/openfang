import { invoke } from '@tauri-apps/api/core'

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

  // If not in Tauri, use default 4200
  if (!isTauri()) {
    return 4200
  }

  try {
    // Call Tauri command to get the actual port
    const port = await invoke<number>('get_port')
    tauriPort = port
    console.log('[Tauri] API server port:', port)
    return port
  } catch (err) {
    console.warn('[Tauri] Failed to get port, falling back to 4200:', err)
    return 4200
  }
}

/**
 * Get the base URL for API requests
 * In Tauri: http://127.0.0.1:{dynamic_port}
 * In browser dev: uses Vite proxy (relative URL)
 */
export async function getApiBaseUrl(): Promise<string> {
  if (isTauri()) {
    const port = await getApiPort()
    return `http://127.0.0.1:${port}`
  }
  // In dev mode with Vite proxy, use relative URL
  return ''
}

/**
 * Get WebSocket base URL
 */
export async function getWsBaseUrl(): Promise<string> {
  if (isTauri()) {
    const port = await getApiPort()
    return `ws://127.0.0.1:${port}`
  }
  // In dev mode, always connect to OpenFang backend on port 4200
  // window.location.host would give Vite's port (5173) which is wrong
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//127.0.0.1:4200`
}

/**
 * Reset cached port (for testing)
 */
export function resetApiPort(): void {
  tauriPort = null
}
