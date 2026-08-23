import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import type { Channel, ChannelAuthorizationCallback } from 'pusher-js'
import { api } from './axios'

// laravel-echo's Pusher connector reads the client off `window.Pusher`.
declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

export type SigmaEcho = Echo<'reverb'>

let echoInstance: SigmaEcho | null = null

/**
 * Lazily creates (or returns the existing) Echo instance wired to our
 * Reverb server. Nothing connects at import time — call this only when a
 * realtime feature is actually mounted (Phase 4+) so unauthenticated pages
 * never open a socket for nothing.
 */
export function createEcho(): SigmaEcho {
  if (echoInstance) {
    return echoInstance
  }

  if (typeof window !== 'undefined') {
    window.Pusher = Pusher
  }

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT),
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    // Authorize private/presence channels through our Sanctum-aware axios
    // instance so the session cookie + XSRF header ride along automatically.
    // TODO(Phase 4): exercise this against a real private channel.
    authorizer: (channel: Channel) => ({
      authorize(socketId: string, callback: ChannelAuthorizationCallback) {
        api
          .post('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
          })
          .then((response) => callback(null, response.data))
          .catch((error) => callback(error, null))
      },
    }),
  })

  return echoInstance
}

/** Disconnects and clears the current Echo instance, e.g. on logout. */
export function destroyEcho() {
  echoInstance?.disconnect()
  echoInstance = null
}
