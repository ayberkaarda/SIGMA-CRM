import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from './features/auth/components/RequireAuth'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ChangePasswordPage } from './features/auth/pages/ChangePasswordPage'
import { registerUnauthorizedHandler, registerPasswordChangeHandler } from './lib/axios'
import { useAuthStore } from './features/auth/store'
import { AppLayout } from './components/layout/AppLayout'
import { UsersPage } from './features/users/pages/UsersPage'
import { LogsPage } from './features/logs/pages/LogsPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import Showcase from './pages/Showcase'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/change-password',
    element: (
      <RequireAuth>
        <ChangePasswordPage />
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'users',
        element: (
          <RequireAuth permission="users.view">
            <UsersPage />
          </RequireAuth>
        ),
      },
      {
        path: 'logs',
        element: (
          <RequireAuth permission="logs.view">
            <LogsPage />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: '/showcase',
    element: <Showcase />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

/**
 * Axios interceptor 401 (ve pasifleştirilmiş hesap 403) yanıtında bu
 * callback'i tetikler — auth store'u temizler ve `/login`'e yönlendirir.
 * `PASSWORD_CHANGE_REQUIRED` (403) için ayrı bir callback kaydedilir: oturum
 * hâlâ geçerli olduğundan store TEMİZLENMEZ, yalnızca `/change-password`'e
 * yönlendirilir (bkz. docs/AUTH-FLOWS.md §4.3). `App.tsx` içinde bir kez
 * kayıt edilir.
 */
export function registerAuthRedirect() {
  registerUnauthorizedHandler(() => {
    useAuthStore.getState().clear()
    void router.navigate('/login')
  })

  registerPasswordChangeHandler(() => {
    void router.navigate('/change-password')
  })
}
