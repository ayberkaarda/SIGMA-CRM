// İlgili kayıt (taskable/activityable) türü -> ikon + bağlantı yolu + görünen ad eşleyicisi.
// Hem `TasksPage`/`TaskFormModal` hem de `activities` modülü (aynı `TaskableType` şeklini
// kullanır) BU dosyadan import eder — iki modülde aynı eşleme iki kez yazılmasın diye.
//
// `ticket` artık BEŞ tipin hepsi gibi seçilebilir: `GET /api/tickets?q=` ucu D şeridi
// tarafından tamamlandı (bkz. `RelatedRecordPicker`'ın ticket arama dalı). `tickets.view`
// izni olmayan bir kullanıcı için seçeneği GİZLEME kararı bu sabit listede DEĞİL, kullanım
// yerinde (`RelatedRecordPicker`, 403 tespitiyle) verilir — bu dosya salt statik bir eşleme,
// izin durumundan haberi yok.
import { Building2, Handshake, Ticket, User, UserPlus } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import type { TaskableType } from '../types'

export const RELATED_RECORD_SELECTABLE_TYPES: TaskableType[] = ['deal', 'lead', 'contact', 'company', 'ticket']

type RelatedRecordMeta = {
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  path: (id: number) => string
}

const RELATED_RECORD_META: Record<TaskableType, RelatedRecordMeta> = {
  deal: { label: 'Fırsat', icon: Handshake, path: (id) => `/deals/${id}` },
  lead: { label: 'Müşteri Adayı', icon: UserPlus, path: (id) => `/leads/${id}` },
  contact: { label: 'Kişi', icon: User, path: (id) => `/contacts/${id}` },
  company: { label: 'Firma', icon: Building2, path: (id) => `/companies/${id}` },
  ticket: { label: 'Talep', icon: Ticket, path: (id) => `/tickets/${id}` },
}

export function relatedRecordMeta(type: TaskableType): RelatedRecordMeta {
  return RELATED_RECORD_META[type]
}

export function relatedRecordTypeLabel(type: TaskableType): string {
  return RELATED_RECORD_META[type].label
}
