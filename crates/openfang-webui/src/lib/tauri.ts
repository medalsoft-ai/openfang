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
