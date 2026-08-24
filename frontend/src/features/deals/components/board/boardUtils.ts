// Pano bileşenlerinin paylaştığı biçimlendiriciler ve renk eşlemeleri.
//
// DİNAMİK SINIF ADI ÜRETİLMEZ: `bg-${color}-tint` gibi bir enterpolasyon Tailwind v4'ün
// içerik taramasında hiç görünmez ve üretilen CSS'te bulunmaz — bileşen sessizce renksiz
// kalır. Bu yüzden aşama rengi önce `tokenBadgeVariant` ile beyaz listeye indirgenir, sonra
// LİTERAL sınıf adları taşıyan sabit bir tablodan okunur.
import { tokenBadgeVariant } from '../../../../components/shared/tokenBadgeVariant'
import type { BadgeVariant } from '../../../../components/shared/tokenBadgeVariant'
import { formatMoneyCompact } from '../../../../lib/money'

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
 * ",00" kuyruğu dar sütunda taşmaktan başka bir şey yapmıyor. Merkezi `lib/money.ts`teki
 * `formatMoneyCompact`'e devredilir — davranış aynı, artık modülün sessiz kararı değil.
 */
export const formatAmount = formatMoneyCompact

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
