// Zorunlu şifre değişimi — AppLayout DIŞINDA tam sayfa (bkz. docs/AUTH-FLOWS.md §4).
// Geçici şifreyle giriş yapan kullanıcı, tek kaçış yolu "Çıkış Yap" olacak şekilde
// buraya hapsedilir; RequireAuth her korumalı route'tan buraya yönlendirir. Gerçek
// dayatma sunucudadır (EnsurePasswordIsChanged middleware) — bu ekran yalnızca UX'tir.
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Check, Eye, EyeOff, LogOut, X } from 'lucide-react'
import { Button, Card, CardBody, Input, toast } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { getErrorMessage, getFieldErrors } from '../../../lib/axios'
import { evaluatePassword } from '../../../features/users/utils/password'
import { useAuth, useChangePassword } from '../hooks/useAuth'

type LocationState = { from?: { pathname: string } }

function getRetryAfterSeconds(error: unknown): number | null {
  if (!isAxiosError(error)) return null
  const header = error.response?.headers?.['retry-after']
  const seconds = Number(header)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status, logout } = useAuth()
  const changePassword = useChangePassword()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  const currentPasswordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    currentPasswordRef.current?.focus()
  }, [])

  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  // Ters guard: bayrak zaten temizse bu ekranın burada işi yok.
  if (status === 'authenticated' && user && !user.must_change_password) {
    return <Navigate to="/" replace />
  }

  const evaluation = evaluatePassword(password)
  const submitDisabled = changePassword.isPending || lockoutSeconds > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitDisabled) return

    setFormError(null)
    setFieldErrors({})

    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      toast.success('Şifreniz güncellendi.')
      const state = location.state as LocationState | null
      navigate(state?.from?.pathname ?? '/', { replace: true })
    } catch (error) {
      const retryAfter = getRetryAfterSeconds(error)
      if (retryAfter) {
        setLockoutSeconds(retryAfter)
        toast.error(`Çok fazla deneme. ${retryAfter} saniye sonra tekrar deneyin.`)
        return
      }

      const fields = getFieldErrors(error)
      if (fields) {
        setFieldErrors(fields)
      }
      setFormError(getErrorMessage(error))
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-2xl font-semibold tracking-tight text-fg">SIGMA-CRM</span>
          <p className="text-sm text-fg-muted">Şifrenizi değiştirmeniz gerekiyor</p>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <p className="text-sm text-fg-muted">
              Hesabınıza geçici bir şifreyle giriş yaptınız. Devam etmeden önce kalıcı, yalnızca sizin
              bildiğiniz yeni bir şifre belirlemeniz gerekiyor.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div aria-live="polite">
                {formError && (
                  <div className="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">
                    {formError}
                  </div>
                )}
              </div>

              <Input
                ref={currentPasswordRef}
                type={showCurrent ? 'text' : 'password'}
                label="Mevcut (geçici) şifre"
                name="current_password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrent((current) => !current)}
                    className="pointer-events-auto text-fg-muted hover:text-fg"
                    aria-label={showCurrent ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showCurrent ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                }
                error={fieldErrors.current_password?.[0]}
                required
              />

              <Input
                type={showNew ? 'text' : 'password'}
                label="Yeni şifre"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNew((current) => !current)}
                    className="pointer-events-auto text-fg-muted hover:text-fg"
                    aria-label={showNew ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showNew ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                }
                error={fieldErrors.password?.[0]}
                required
              />

              <ul className="flex flex-col gap-1" aria-live="polite">
                {evaluation.rules.map((rule) => (
                  <li
                    key={rule.id}
                    className={cn('flex items-center gap-1.5 text-xs', rule.met ? 'text-success' : 'text-fg-muted')}
                  >
                    {rule.met ? (
                      <Check className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <X className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {rule.label}
                  </li>
                ))}
              </ul>

              <Input
                type={showConfirm ? 'text' : 'password'}
                label="Yeni şifre (tekrar)"
                name="password_confirmation"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((current) => !current)}
                    className="pointer-events-auto text-fg-muted hover:text-fg"
                    aria-label={showConfirm ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showConfirm ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                }
                error={fieldErrors.password_confirmation?.[0]}
                required
              />

              <Button type="submit" fullWidth loading={changePassword.isPending} disabled={submitDisabled}>
                {lockoutSeconds > 0 ? `Tekrar deneyin (${lockoutSeconds}s)` : 'Şifreyi Değiştir'}
              </Button>
            </form>

            <Button variant="ghost" fullWidth leftIcon={<LogOut className="size-4" aria-hidden="true" />} onClick={handleLogout}>
              Çıkış Yap
            </Button>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
