// Kullanıcı oluşturma/düzenleme modalı. `user` prop'u verilmezse (null/undefined) oluşturma modu.
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, Info, Wand2 } from 'lucide-react'
import { Button, Input, Modal, Select, toast } from '../../../components/ui'
import { cn } from '../../../lib/cn'
import { getFieldErrors } from '../../../lib/axios'
import { useCreateUser, useRoles, useUpdateUser } from '../api/usersApi'
import { evaluatePassword, generateStrongPassword } from '../utils/password'
import type { User } from '../types'

type UserFormModalProps = {
  open: boolean
  onClose: () => void
  user?: User | null
}

const STRENGTH_BAR_COLOR: Record<number, string> = {
  0: 'bg-danger',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-warning',
  4: 'bg-success',
  5: 'bg-success',
}

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const isEdit = !!user
  const { data: roles } = useRoles()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Modal her açılışında (veya farklı bir kullanıcı için açıldığında) formu sıfırla/doldur.
  // `useEffect` + setState yerine render sırasında ayarlama (React'ın önerdiği "prop değiştiğinde
  // state sıfırlama" deseni) — kapanış animasyonu sırasında alanları boşaltmamak için yalnızca
  // açılış anında tetiklenir.
  const openKey = open ? (user ? `edit-${user.id}` : 'create') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setName(user?.name ?? '')
      setEmail(user?.email ?? '')
      setRoleName(user?.role?.name ?? '')
      setDepartment(user?.department ?? '')
      setPassword('')
      setShowPassword(false)
      setFieldErrors({})
    }
  }

  const passwordEvaluation = useMemo(() => evaluatePassword(password), [password])
  const isPending = createUser.isPending || updateUser.isPending

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  function handleGeneratePassword() {
    setPassword(generateStrongPassword())
    setShowPassword(true)
  }

  async function handleCopyPassword() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      toast.success('Şifre panoya kopyalandı.')
    } catch {
      toast.error('Panoya kopyalanamadı. Şifreyi elle seçip kopyalayın.')
    }
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!name.trim()) errors.name = ['Ad soyad zorunludur.']
    if (!email.trim()) errors.email = ['E-posta zorunludur.']
    if (!roleName) errors.role = ['Rol seçimi zorunludur.']
    if (!isEdit && !passwordEvaluation.isValid) {
      errors.password = ['Şifre, politika kurallarının tamamını karşılamalıdır.']
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          payload: { name, email, role: roleName, department: department || undefined },
        })
      } else {
        await createUser.mutateAsync({
          name,
          email,
          password,
          role: roleName,
          department: department || undefined,
        })
      }
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  const roleOptions = [
    { value: '', label: 'Rol seçin', disabled: true },
    ...(roles ?? []).map((role) => ({ value: role.name, label: role.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="user-form" loading={isPending}>
            {isEdit ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldError('name')}
          required
        />
        <Input
          label="E-posta"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError('email')}
          required
        />
        <Select
          label="Rol"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          options={roleOptions}
          error={fieldError('role')}
        />
        <Input
          label="Departman"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          error={fieldError('department')}
        />

        {!isEdit && (
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Geçici Şifre"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldError('password')}
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
                onClick={handleGeneratePassword}
                title="Rastgele güçlü şifre üret"
                aria-label="Rastgele güçlü şifre üret"
              >
                <Wand2 className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyPassword}
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
                        i < passwordEvaluation.score && STRENGTH_BAR_COLOR[passwordEvaluation.score]
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-fg-muted">Güç: {passwordEvaluation.strengthLabel}</p>
                <ul className="flex flex-col gap-1">
                  {passwordEvaluation.rules.map((rule) => (
                    <li
                      key={rule.id}
                      className={cn('flex items-center gap-1.5 text-xs', rule.met ? 'text-success' : 'text-fg-muted')}
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!isEdit && (
          <div className="flex items-start gap-2 rounded-md bg-primary-tint p-3 text-xs text-primary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Kullanıcı oluşturulduğunda geçici şifre ile giriş yapar ve ilk girişte şifresini değiştirmek
              zorundadır.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}
