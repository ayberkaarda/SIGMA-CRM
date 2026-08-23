import { api, getCsrfCookie } from '../../../lib/axios'
import type { ChangePasswordPayload, ForgotPasswordPayload, LoginPayload, User } from '../types'

/**
 * Logs the user in via Sanctum's SPA (cookie-based) flow. The CSRF cookie
 * must be fresh before an unsafe request, so it's (re)fetched first.
 */
export async function login(payload: LoginPayload): Promise<User> {
  await getCsrfCookie()
  const { data } = await api.post<{ data: User }>('/api/login', payload)
  return data.data
}

export async function logout(): Promise<void> {
  await api.post('/api/logout')
}

export async function me(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/api/me')
  return data.data
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await api.post('/api/password/forgot', payload)
}

/**
 * Zorunlu (veya gönüllü — Faz 10) şifre değişimi. Sunucu bayrağı temizler ve
 * güncel `User`'ı `GET /api/me` ile aynı zarfta döner; ek `/me` çağrısı gerekmez.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<User> {
  const { data } = await api.post<{ data: User }>('/api/password/change', payload)
  return data.data
}
