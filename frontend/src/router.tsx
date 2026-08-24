import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from './features/auth/components/RequireAuth'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ChangePasswordPage } from './features/auth/pages/ChangePasswordPage'
import { registerUnauthorizedHandler, registerPasswordChangeHandler } from './lib/axios'
import { useAuthStore } from './features/auth/store'
import { AppLayout } from './components/layout/AppLayout'
import { UsersPage } from './features/users/pages/UsersPage'
import { LogsPage } from './features/logs/pages/LogsPage'
import { LeadsPage } from './features/leads/pages/LeadsPage'
import { LeadDetailPage } from './features/leads/pages/LeadDetailPage'
import { DealsBoardPage } from './features/deals/pages/DealsBoardPage'
import { DealsListPage } from './features/deals/pages/DealsListPage'
import { DealDetailPage } from './features/deals/pages/DealDetailPage'
import { TasksPage } from './features/tasks/pages/TasksPage'
import { ActivitiesPage } from './features/activities/pages/ActivitiesPage'
import { TicketsListPage } from './features/tickets/pages/TicketsListPage'
import { TicketDetailPage } from './features/tickets/pages/TicketDetailPage'
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
      {
        path: 'leads',
        element: (
          <RequireAuth permission="leads.view">
            <LeadsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'leads/:id',
        element: (
          <RequireAuth permission="leads.view">
            <LeadDetailPage />
          </RequireAuth>
        ),
      },
      // Fırsatlar. Rota sırası KASITLI: sabit `deals/list` segmenti `deals/:id`den ÖNCE
      // gelmeli, aksi hâlde "list" bir id sanılır ve liste görünümü detay sayfasına düşer.
      {
        path: 'deals',
        element: (
          <RequireAuth permission="deals.view">
            <DealsBoardPage />
          </RequireAuth>
        ),
      },
      {
        path: 'deals/list',
        element: (
          <RequireAuth permission="deals.view">
            <DealsListPage />
          </RequireAuth>
        ),
      },
      {
        path: 'deals/:id',
        element: (
          <RequireAuth permission="deals.view">
            <DealDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: 'tasks',
        element: (
          <RequireAuth permission="tasks.view">
            <TasksPage />
          </RequireAuth>
        ),
      },
      {
        path: 'activities',
        element: (
          <RequireAuth permission="activities.view">
            <ActivitiesPage />
          </RequireAuth>
        ),
      },
      // Destek Talepleri (Faz 8 / D). Rota sırası KASITLI: sabit `tickets/:id` segmenti bir
      // sayı beklediği için `/tickets` (liste) ile aralarında bir belirsizlik yok (deals'taki
      // `list` segmenti gibi ayrı bir sabit alt yol GEREKMEZ).
      {
        path: 'tickets',
        element: (
          <RequireAuth permission="tickets.view">
            <TicketsListPage />
          </RequireAuth>
        ),
      },
      {
        path: 'tickets/:id',
        element: (
          <RequireAuth permission="tickets.view">
            <TicketDetailPage />
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
