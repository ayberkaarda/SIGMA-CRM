// Leads modülü için paylaşılan sabitler/yardımcılar — liste, form, detay ve
// dönüştürme modalı arasında tekrarı önler.
import type { BadgeProps } from '../../components/ui'
import type { DuplicateLevel, DuplicateMatchReason, LeadSource, LeadStatus } from './types'

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Web Sitesi',
  referral: 'Referans',
  cold_call: 'Soğuk Arama',
  email_campaign: 'E-posta Kampanyası',
  social_media: 'Sosyal Medya',
  event: 'Etkinlik',
  other: 'Diğer',
}

export const SOURCE_OPTIONS: Array<{ value: LeadSource; label: string }> = (
  Object.keys(SOURCE_LABELS) as LeadSource[]
).map((value) => ({ value, label: SOURCE_LABELS[value] }))

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Yeni',
  contacted: 'İletişime Geçildi',
  qualified: 'Nitelikli',
  unqualified: 'Niteliksiz',
  converted: 'Dönüştürüldü',
}

/** Formdaki durum seçiminde `converted` KASITLI olarak yok (bkz. görev tanımı). */
export const EDITABLE_STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
].map((value) => ({ value: value as LeadStatus, label: STATUS_LABELS[value as LeadStatus] }))

export const STATUS_BADGE_VARIANT: Record<LeadStatus, NonNullable<BadgeProps['variant']>> = {
  new: 'neutral',
  contacted: 'primary',
  qualified: 'success',
  unqualified: 'danger',
  converted: 'success',
}

export function scoreVariant(score: number): 'danger' | 'warning' | 'success' {
  if (score >= 67) return 'success'
  if (score >= 34) return 'warning'
  return 'danger'
}

export const MATCH_REASON_LABELS: Record<DuplicateMatchReason, string> = {
  email: 'E-posta aynı',
  phone: 'Telefon aynı',
  name: 'Ad soyad aynı',
}

export const DUPLICATE_LEVEL_LABELS: Record<DuplicateLevel, string> = {
  strong: 'Güçlü eşleşme',
  possible: 'Olası eşleşme',
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}
