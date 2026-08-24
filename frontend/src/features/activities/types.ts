// Aktiviteler (Activities) modülü tipleri — backend `ActivityResource` ile birebir eşleşir
// (bkz. Faz 8 / C görev tanımı). `TaskableType`/`TaskableRef` `features/tasks/types.ts`'ten
// TEKRARLANMAZ — ilgili-kayıt şekli iki modülde de aynı olduğu için oradan import edilir (bkz.
// `RelatedRecordPicker`in de `features/tasks/components/` altında tutulma gerekçesi).
import type { TaskableRef, TaskableType, UserOption } from '../tasks/types'

export const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'note'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type ActivityUserRef = { id: number; name: string }

export type Activity = {
  id: number
  type: ActivityType
  subject: string
  body: string | null
  occurred_at: string | null
  duration_minutes: number | null
  outcome: string | null
  user: ActivityUserRef | null
  activityable: TaskableRef | null
  created_at: string | null
  updated_at: string | null
}

export type Pagination = {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type ActivitiesListResponse = {
  data: Activity[]
  meta: { pagination: Pagination }
}

export type ActivitiesQuery = {
  page?: number
  per_page?: number
  sort?: string
  q?: string
  type?: ActivityType
  user_id?: number
  activityable_type?: TaskableType
  activityable_id?: number
  from?: string
  to?: string
}

export type ActivityPayload = {
  type: ActivityType
  subject: string
  body?: string | null
  occurred_at: string
  duration_minutes?: number | null
  outcome?: string | null
  activityable_type?: TaskableType | null
  activityable_id?: number | null
}

export type { TaskableRef, TaskableType, UserOption }
