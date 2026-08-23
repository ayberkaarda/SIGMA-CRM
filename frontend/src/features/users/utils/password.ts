// Şifre politikası ön kontrolü (istemci tarafı) + kriptografik olarak güvenli şifre üretici.
// Asıl doğrulama daima backend'de yapılır; burası yalnızca canlı UX geri bildirimi içindir.

export type PasswordRule = {
  id: string
  label: string
  met: boolean
}

export type PasswordEvaluation = {
  rules: PasswordRule[]
  score: number // 0-5, karşılanan kural sayısı
  isValid: boolean
  strengthLabel: 'Çok zayıf' | 'Zayıf' | 'Orta' | 'İyi' | 'Güçlü'
}

const MIN_LENGTH = 12

const STRENGTH_LABELS: PasswordEvaluation['strengthLabel'][] = [
  'Çok zayıf',
  'Çok zayıf',
  'Zayıf',
  'Orta',
  'İyi',
  'Güçlü',
]

/** Şifre politikası: en az 12 karakter, büyük+küçük harf, rakam, özel karakter. */
export function evaluatePassword(password: string): PasswordEvaluation {
  const rules: PasswordRule[] = [
    { id: 'length', label: `En az ${MIN_LENGTH} karakter`, met: password.length >= MIN_LENGTH },
    { id: 'upper', label: 'En az bir büyük harf', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'En az bir küçük harf', met: /[a-z]/.test(password) },
    { id: 'digit', label: 'En az bir rakam', met: /[0-9]/.test(password) },
    { id: 'special', label: 'En az bir özel karakter', met: /[^A-Za-z0-9]/.test(password) },
  ]

  const score = rules.filter((rule) => rule.met).length

  return {
    rules,
    score,
    isValid: rules.every((rule) => rule.met),
    strengthLabel: STRENGTH_LABELS[score],
  }
}

// Karışıklığa yol açabilecek karakterler (0/O, 1/l/I vb.) bilinçli olarak dışarıda bırakıldı.
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SPECIAL = '!@#$%^&*()-_=+[]{}'
const ALL = LOWER + UPPER + DIGITS + SPECIAL

/** `crypto.getRandomValues` tabanlı, [0, max) aralığında yansız rastgele tamsayı. */
function secureRandomInt(max: number): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] % max
}

function pickChar(charset: string): string {
  return charset[secureRandomInt(charset.length)]
}

/**
 * Şifre politikasının tamamını karşılayan rastgele bir şifre üretir.
 * GÜVENLİK: `Math.random()` DEĞİL, kriptografik olarak güvenli `crypto.getRandomValues` kullanılır.
 */
export function generateStrongPassword(length = 16): string {
  const required = [pickChar(LOWER), pickChar(UPPER), pickChar(DIGITS), pickChar(SPECIAL)]
  const rest = Array.from({ length: Math.max(length - required.length, 0) }, () => pickChar(ALL))
  const chars = [...required, ...rest]

  // Fisher-Yates shuffle — zorunlu 4 karakterin hep baştaki sabit sırada durmaması için.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
