// Auth katmanı paylaşılan tipleri — backend sözleşmesiyle birebir eşleşir
// (bkz. Faz 2 / Dalga 1 görev tanımı).

export type Role = {
  id: number
  name: string
}

export type User = {
  id: number
  name: string
  email: string
  department: string | null
  is_active: boolean
  must_change_password: boolean
  last_login_at: string | null
  created_at: string
  role: Role | null
  /** Örnek: ["users.view", "deals.create", ...] */
  permissions: string[]
}

export type LoginPayload = {
  email: string
  password: string
  remember?: boolean
}

export type ForgotPasswordPayload = {
  email: string
}

export type ChangePasswordPayload = {
  current_password: string
  password: string
  password_confirmation: string
}

/** Tüm uçların döndürdüğü hata gövdesi şekli: `{ errors: { message, code, fields? } }`. */
export type ApiError = {
  errors: {
    message: string
    code: string
    fields?: Record<string, string[]>
  }
}
