import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useAuthStore } from '../store/authStore';

/**
 * Koneksi WebSocket real-time (Laravel Reverb via Echo v2).
 *
 * Instance Echo dibuat lazy per token: saat token berubah (login/logout),
 * koneksi lama diputus dan dibuat ulang dengan token terbaru agar
 * otorisasi channel privat tetap valid.
 */

let echo: Echo<'reverb'> | null = null;
let echoToken: string | null = null;

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export function getEcho(): Echo<'reverb'> {
  const token = useAuthStore.getState().token;

  if (echo && echoToken === token) {
    return echo;
  }

  echo?.disconnect();
  echo = null;
  echoToken = token;

  echo = new Echo<'reverb'>({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'cbt-reverb-key',
    wsHost: import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: `${API_ORIGIN}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token ?? ''}`,
      },
    },
    Pusher,
  });

  return echo;
}

export function disconnectEcho(): void {
  echo?.disconnect();
  echo = null;
  echoToken = null;
}

export interface MonitorSession {
  id: number;
  exam_id: number;
  exam_title?: string | null;
  user_id: number;
  user_name: string | null;
  user_email?: string | null;
  status: 'ongoing' | 'finished' | 'blocked';
  cheat_count: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface MonitorEvent {
  type: 'start' | 'blocked' | 'unblocked' | 'finished';
  exam_id: number;
  session: MonitorSession;
}
