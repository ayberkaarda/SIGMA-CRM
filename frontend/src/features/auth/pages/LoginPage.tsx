import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button, Card, CardBody, Checkbox, Input, Modal, toast } from '../../../components/ui'
import { getErrorMessage, getFieldErrors } from '../../../lib/axios'
import { useAuth, useForgotPassword } from '../hooks/useAuth'

type LocationState = { from?: { pathname: string } }

function getRetryAfterSeconds(error: unknown): number | null {
  if (!isAxiosError(error)) return null
  const header = error.response?.headers?.['retry-after']
  const seconds = Number(header)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoggingIn } = useAuth()
  const forgotPassword = useForgotPassword()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lockoutSeconds > 0 || isLoggingIn) return

    setFormError(null)
    setFieldErrors({})

    try {
      const user = await login({ email, password, remember })
      const state = location.state as LocationState | null
      navigate(state?.from?.pathname ?? '/', { replace: true })
      toast.success(`Hoş geldiniz, ${user.name}`)
    } catch (error) {
      const retryAfter = getRetryAfterSeconds(error)
      if (retryAfter) {
        setLockoutSeconds(retryAfter)
        setFormError(`Çok fazla başarısız deneme. ${retryAfter} saniye sonra tekrar deneyin.`)
        return
      }

      const fields = getFieldErrors(error)
      if (fields) {
        setFieldErrors(fields)
      }
      setFormError(getErrorMessage(error))
    }
  }

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await forgotPassword.mutateAsync({ email: forgotEmail })
      setForgotSent(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  function closeForgotModal() {
    setForgotOpen(false)
    setForgotEmail('')
    setForgotSent(false)
  }

  const submitDisabled = isLoggingIn || lockoutSeconds > 0

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-2xl font-semibold tracking-tight text-fg">SIGMA-CRM</span>
          <p className="text-sm text-fg-muted">Devam etmek için hesabınıza giriş yapın</p>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div aria-live="polite">
                {formError && (
                  <div className="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">
                    {formError}
                  </div>
                )}
              </div>

              <Input
                ref={emailInputRef}
                type="email"
                label="E-posta"
                name="email"
                autoComplete="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                leftIcon={<Mail className="size-4" aria-hidden="true" />}
                error={fieldErrors.email?.[0]}
                required
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                label="Şifre"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                leftIcon={<Lock className="size-4" aria-hidden="true" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="pointer-events-auto text-fg-muted hover:text-fg"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                }
                error={fieldErrors.password?.[0]}
                required
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  label="Beni hatırla"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Şifremi unuttum
                </button>
              </div>

              <Button type="submit" fullWidth loading={isLoggingIn} disabled={submitDisabled}>
                {lockoutSeconds > 0 ? `Tekrar deneyin (${lockoutSeconds}s)` : 'Giriş Yap'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-fg-muted">
          Hesaplar yalnızca sistem yöneticisi tarafından oluşturulur.
        </p>
      </div>

      <Modal
        open={forgotOpen}
        onClose={closeForgotModal}
        title="Şifremi unuttum"
        description={
          forgotSent
            ? undefined
            : 'E-posta adresinizi girin — talebiniz sistem yöneticisine iletilsin. Kendi kendine sıfırlama bu sistemde kapalıdır.'
        }
        size="sm"
      >
        {forgotSent ? (
          <div className="rounded-md border border-success bg-success-tint px-3 py-2 text-sm text-success">
            Talebiniz yöneticiye iletildi.
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              type="email"
              label="E-posta"
              autoComplete="email"
              placeholder="ornek@sirket.com"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={forgotPassword.isPending}>
              Talebi Gönder
            </Button>
          </form>
        )}
      </Modal>
    </main>
  )
}
