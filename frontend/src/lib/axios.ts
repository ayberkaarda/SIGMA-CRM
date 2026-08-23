import axios, { AxiosError } from 'axios'

/**
 * Shared axios instance configured for Laravel Sanctum's SPA (cookie-based)
 * authentication flow.
 *
 * - `withCredentials`: sends/receives the Sanctum session + XSRF cookies.
 * - `withXSRFToken`: required on axios 1.x so the `XSRF-TOKEN` cookie value
 *   is actually attached as the `X-XSRF-TOKEN` header on requests.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Fetches the Sanctum CSRF cookie. Must be called once before the first
 * "unsafe" request (POST/PUT/PATCH/DELETE) in an unauthenticated session,
 * e.g. right before submitting the login form.
 */
export function getCsrfCookie() {
  return api.get('/sanctum/csrf-cookie')
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      // TODO(Phase 2): unauthenticated — redirect to /login or clear auth store.
    }

    if (status === 419) {
      // TODO(Phase 2): CSRF token mismatch/expired — refetch csrf-cookie and retry once.
    }

    return Promise.reject(error)
  },
)

export default api
