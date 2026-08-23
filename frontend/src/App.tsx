import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { Toaster } from './components/ui'
import { router, registerAuthRedirect } from './router'
import { useAuth } from './features/auth/hooks/useAuth'
import { useRealtimeSession } from './features/auth/hooks/useRealtimeSession'

/** `useAuth()`'u ağaç kökünde çağırarak açılışta `/api/me`'yi tetikler ve
 * auth store'u besler — route'lardan bağımsız olarak bir kez monte edilir.
 * `useRealtimeSession()` de burada mount edilir: `private-user.{id}` aboneliği
 * kullanıcı kimliği doğrulanır doğrulanmaz kurulmalı, herhangi bir route'a
 * bağlı olmamalı (bkz. Faz 4 / Dalga 2 görev tanımı §6). */
function AuthBootstrap() {
  useAuth()
  useRealtimeSession()
  return null
}

function App() {
  useEffect(() => {
    registerAuthRedirect()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
