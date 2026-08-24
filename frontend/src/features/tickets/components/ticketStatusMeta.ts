// Talep durumu sabitleri — `TicketStatusBadge.tsx`'ten AYRI (bkz. `ticketPriorityMeta.ts`
// başındaki aynı gerekçe).
//
// `STATUS_TRANSITIONS` — `docs/SLA-DESIGN.md` §4'teki `TicketStatusMachine::TRANSITIONS`
// sabitinin İSTEMCİ TARAFI AYNASI. Backend'de geçiş kararı `PATCH /api/tickets/{id}/status`
// içinde `lockForUpdate` ile verilir (eşzamanlılık) — bu yüzden istemci burada YALNIZCA
// "geçersiz seçeneği KULLANICIYA HİÇ GÖSTERME" amacıyla aynı tabloyu tutar (görev tanımı: "UI
// yalnızca geçerli geçişleri sunmalı"). Sunucu her zaman OTORİTEDİR: eşzamanlı bir istek
// bu tabloyu bayatlatırsa (ör. iki sekme aynı anda durum değiştirirse) sunucu yine de 422
// `INVALID_STATUS_TRANSITION` döner ve `TicketStatusControl` bunu normal hata olarak gösterir —
// bu tablo yalnızca İYİMSER bir ön filtredir, ikinci bir doğruluk kaynağı değildir.
//
// `closed` TERMİNALDİR (boş dizi): §4 gerekçesiyle aynı — kapanmış dönem raporları geriye dönük
// değişmez kalmalı, bu yüzden yeniden açılamaz.
import type { TicketStatus } from '../types'
import type { BadgeProps } from '../../../components/ui'

export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'pending', 'resolved'],
  in_progress: ['open', 'pending', 'resolved'],
  pending: ['open', 'in_progress', 'resolved'],
  resolved: ['open', 'closed'],
  closed: [],
}

export const STATUS_VARIANT: Record<TicketStatus, NonNullable<BadgeProps['variant']>> = {
  open: 'neutral',
  pending: 'warning',
  in_progress: 'primary',
  resolved: 'success',
  closed: 'neutral',
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Açık',
  pending: 'Beklemede',
  in_progress: 'Devam Ediyor',
  resolved: 'Çözüldü',
  closed: 'Kapandı',
}

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as TicketStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}))

export function allowedTransitions(from: TicketStatus): TicketStatus[] {
  return STATUS_TRANSITIONS[from]
}
