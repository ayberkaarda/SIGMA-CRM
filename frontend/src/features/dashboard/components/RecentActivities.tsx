// Son aktiviteler — grafik değil, kısa bir liste (choosing-a-form.md: her satır bir olay,
// büyüklük/kimlik kodlaması gerektirmiyor). `App\Http\Resources\Reports\RecentActivityResource`
// ile birebir: `type` (call/meeting/email/note), `subject` (aktivitenin kendi başlığı), `user`
// (kaydeden), `related` (bağlı olduğu kayıt — fırsat/aday/vb.). İkon+etiket eşlemesi Aktiviteler
// modülündeki `activityTypeMeta.ts`den YENİDEN KULLANILIR (kopyalanmaz) — "arama" ikonu her yerde
// aynı anlama gelsin diye; bilinmeyen bir `type` gelirse (silinmiş/gelecekte eklenen bir tür)
// genel `Activity` ikonuna ve ham metne sessizce düşülür.
import { Activity } from 'lucide-react'
import { EmptyState, Skeleton } from '../../../components/ui'
import { TYPE_ICON, TYPE_LABEL } from '../../activities/components/activityTypeMeta'
import type { ActivityType } from '../../activities/types'
import { formatRelativeTime } from '../utils/chartTheme'
import type { RecentActivity } from '../types'

const RELATED_TYPE_LABELS: Record<string, string> = {
  deal: 'Fırsat',
  lead: 'Aday',
  contact: 'Kişi',
  company: 'Şirket',
  ticket: 'Talep',
  task: 'Görev',
  quote: 'Teklif',
}

function isKnownActivityType(type: string): type is ActivityType {
  return type in TYPE_ICON
}

// Backend gerçekte yalnızca bu dördünü döndürür — `StoreActivityRequest`/`UpdateActivityRequest`
// `Rule::in(['call','meeting','email','note'])` ile doğruluyor (bkz. Faz 8). Ama
// `RecentActivityResource::toArray` `type`'ı `$activity->type` olarak HAM basıyor, tipi
// yeniden doğrulamıyor — kapalı devre sistemde ileride eklenecek bir tür veya eski/seed verisi
// beyaz liste dışı bir değer taşıyabilir. Bu yüzden `type` burada geniş `string` kalır ve altta
// güvenli bir erişimciyle okunur; tip koruması doğrudan üçlü ifadenin koşulunda ÇAĞRILIR (bir ara
// `known` değişkenine atanıp sonra kullanılırsa TS bunu `activity.type`e geri yansıtmıyor —
// TS7053 buradan geliyordu), böylece `TYPE_ICON[type]` erişimi güvenle daraltılmış olur.
function activityTypeIcon(type: string) {
  return isKnownActivityType(type) ? TYPE_ICON[type] : Activity
}

function activityTypeLabel(type: string): string {
  return isKnownActivityType(type) ? TYPE_LABEL[type] : type
}

export type RecentActivitiesProps = {
  activities: RecentActivity[] | undefined
  isLoading: boolean
}

export function RecentActivities({ activities, isLoading }: RecentActivitiesProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="circle" width={32} height={32} />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-6" aria-hidden="true" />}
        title="Henüz aktivite yok"
        description="Kaydedilmiş bir aktivite bulunamadı."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {activities.map((activity) => {
        const Icon = activityTypeIcon(activity.type)
        const typeLabel = activityTypeLabel(activity.type)
        const actor = activity.user?.name ?? 'Sistem'
        const related = activity.related

        return (
          <li key={activity.id} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-sm text-fg">
                <span className="font-medium">{actor}</span>{' '}
                <span className="text-fg-muted">{typeLabel}</span>
                {activity.subject && (
                  <>
                    {' — '}
                    <span className="font-medium">{activity.subject}</span>
                  </>
                )}
              </p>
              <p className="truncate text-xs text-fg-muted">
                {related && (
                  <>
                    {RELATED_TYPE_LABELS[related.type] ?? related.type}
                    {related.label ? `: ${related.label}` : ''}
                    {' · '}
                  </>
                )}
                {activity.occurred_at ? formatRelativeTime(activity.occurred_at) : '—'}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
