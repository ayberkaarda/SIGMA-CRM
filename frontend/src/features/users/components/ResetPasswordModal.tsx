// Belirli bir kullanıcı için şifre sıfırlama modalı — aynı politika + üretici, `UserFormModal`
// ile paylaşılan `evaluatePassword`/`generateStrongPassword` yardımcılarını kullanır.
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, Wand2 } from 'lucide-react'
import { Button, Input, Modal, toast } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { getFieldErrors } from '../../../lib/axios'
import { useResetPassword } from '../api/usersApi'
import { evaluatePassword, generateStrongPassword } from '../utils/password'
import type { User } from '../types'

type ResetPasswordModalProps = {
  open: boolean
  onClose: () => void
  /** `null` iken bileşen yalnızca kapanış animasyonu için mount edilmiş kalır. */
  user: User | null
}

const STRENGTH_BAR_COLOR: Record<number, string> = {
  0: 'bg-danger',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-warning',
  4: 'bg-success',
  5: 'bg-success',
}

export function ResetPasswordModal({ open, onClose, user }: ResetPasswordModalProps) {
  const resetPassword = useResetPassword()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // Render sırasında ayarlama deseni (bkz. `UserFormModal`) — yalnızca açılış anında sıfırlar,
  // kapanış animasyonu sırasında alanları boşaltmaz.
  const openKey = open && user ? `reset-${user.id}` : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setPassword('')
      setShowPassword(false)
      setError(undefined)
    }
  }

  const evaluation = useMemo(() => evaluatePassword(password), [password])

  function handleGenerate() {
    setPassword(generateStrongPassword())
    setShowPassword(true)
  }

  async function handleCopy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      toast.success('Şifre panoya kopyalandı.')
    } catch {
      toast.error('Panoya kopyalanamadı. Şifreyi elle seçip kopyalayın.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    if (!evaluation.isValid) {
      setError('Şifre, politika kurallarının tamamını karşılamalıdır.')
      return
    }
    try {
      await resetPassword.mutateAsync({ id: user.id, password })
      onClose()
    } catch (err) {
      const serverErrors = getFieldErrors(err)
      setError(serverErrors?.password?.[0])
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Şifreyi Sıfırla"
      description={user ? `${user.name} (${user.email}) için yeni geçici şifre belirleyin.` : undefined}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="reset-password-form" loading={resetPassword.isPending} disabled={!user}>
            Şifreyi Sıfırla
          </Button>
        </div>
      }
    >
      <form id="reset-password-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Yeni Şifre"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  className="pointer-events-auto text-fg-muted hover:text-fg"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              }
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            title="Rastgele güçlü şifre üret"
            aria-label="Rastgele güçlü şifre üret"
          >
            <Wand2 className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCopy}
            disabled={!password}
            title="Panoya kopyala"
            aria-label="Şifreyi panoya kopyala"
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {password && (
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <div className="flex h-1.5 gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-full flex-1 rounded-full bg-surface-2',
                    i < evaluation.score && STRENGTH_BAR_COLOR[evaluation.score]
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-fg-muted">Güç: {evaluation.strengthLabel}</p>
            <ul className="flex flex-col gap-1">
              {evaluation.rules.map((rule) => (
                <li key={rule.id} className={cn('flex items-center gap-1.5 text-xs', rule.met ? 'text-success' : 'text-fg-muted')}>
                  <Check className="size-3.5" aria-hidden="true" />
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  )
}
