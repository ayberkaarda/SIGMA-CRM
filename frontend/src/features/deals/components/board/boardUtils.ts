// Pano bileşenlerinin paylaştığı biçimlendiriciler ve renk eşlemeleri.
//
// DİNAMİK SINIF ADI ÜRETİLMEZ: `bg-${color}-tint` gibi bir enterpolasyon Tailwind v4'ün
// içerik taramasında hiç görünmez ve üretilen CSS'te bulunmaz — bileşen sessizce renksiz
// kalır. Bu yüzden aşama rengi önce `tokenBadgeVariant` ile beyaz listeye indirgenir, sonra
// LİTERAL sınıf adları taşıyan sabit bir tablodan okunur.
import { tokenBadgeVariant } from '../../../../components/shared/tokenBadgeVariant'
import type { BadgeVariant } from '../../../../components/shared/tokenBadgeVariant'

const STAGE_ACCENT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  neutral: 'bg-border-strong',
}

/** Sütun başlığındaki renk şeridi için literal arka plan sınıfı. */
export function stageAccentClass(color: string | null | undefined): string {
  return STAGE_ACCENT_CLASSES[tokenBadgeVariant(color)]
}

export { tokenBadgeVariant }

/**
 * Para biçimi. Kuruş GÖSTERİLMEZ: pano sütun başlıklarında yüz binlik toplamlar var ve
 * ",00" kuyruğu dar sütunda taşmaktan başka bir şey yapmıyor.
 */
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // Tanınmayan bir para birimi kodu gelirse Intl fırlatır; sayı yine de gösterilmeli.
    return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(amount)} ${currency}`
  }
}

export function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(
      new Date(`${value}T00:00:00`)
    )
  } catch {
    return value
  }
}
