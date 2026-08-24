// Kanban kartı. İki dışa aktarım var:
// - `DealBoardCard`: panodaki sortable kart.
// - `DealCardPreview`: `DragOverlay` içinde imleci takip eden kopya (sortable değil).
//
// ERİŞİLEBİLİRLİK — İKİ AYRI ODAK HEDEFİ
// Kart gövdesi sürükleme tutamağıdır: Tab ile odaklanılır, Boşluk/Enter ile kart "alınır",
// ok tuşlarıyla taşınır (dnd-kit `KeyboardSensor`). Başlık ise ayrı bir bağlantıdır ve
// Enter ile detay sayfasını açar. İkisi tek elemanda toplanamaz — aynı tuş hem "kartı al"
// hem "sayfayı aç" anlamına gelemez. Bağlantı üzerindeki `keydown` bu yüzden yukarı
// SIÇRAMAZ; sıçrasaydı başlıkta Enter'a basmak sürüklemeyi başlatırdı.
import { Link, useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, CalendarDays, TriangleAlert } from 'lucide-react'
import { Avatar, Badge } from '../../../../components/ui'
import { cn } from '../../../../lib/cn'
import { formatAmount, formatDate, tokenBadgeVariant } from './boardUtils'
import type { DealCard } from '../../types'

type DealCardBodyProps = {
  card: DealCard
  /** Kartı başkası taşıdıysa taşıyanın adı — kısa süreli görsel vurgu için. */
  movedBy?: string
  isOverlay?: boolean
}

function DealCardBody({ card, movedBy, isOverlay = false }: DealCardBodyProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/deals/${card.id}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
          }}
          className="rounded-sm text-sm font-medium text-fg hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {card.title}
        </Link>
        {card.probability !== null && (
          <span className="shrink-0 text-xs text-fg-muted">%{card.probability}</span>
        )}
      </div>

      <p className="text-base font-semibold text-fg">{formatAmount(card.amount, card.currency)}</p>

      {card.company && (
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{card.company.name}</span>
        </p>
      )}

      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <Badge key={tag.id} size="sm" variant={tokenBadgeVariant(tag.color)}>
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <span
          className={cn(
            'flex items-center gap-1.5 text-xs',
            card.is_overdue ? 'text-danger' : 'text-fg-muted'
          )}
        >
          {card.is_overdue ? (
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          {formatDate(card.expected_close_date)}
          {card.is_overdue && <span className="sr-only">(gecikmiş)</span>}
        </span>

        {card.owner ? (
          <Avatar size="xs" name={card.owner.name} title={card.owner.name} />
        ) : (
          <span className="text-xs text-fg-disabled">Sahipsiz</span>
        )}
      </div>

      {movedBy && !isOverlay && (
        <p className="text-xs text-primary">{movedBy} bu kartı taşıdı</p>
      )}
    </>
  )
}

const CARD_BASE_CLASSES =
  'flex w-full flex-col gap-2 rounded-lg border border-border bg-surface-1 p-3 text-left'

export type DealBoardCardProps = {
  card: DealCard
  dragEnabled: boolean
  movedBy?: string
}

export function DealBoardCard({ card, dragEnabled, movedBy }: DealBoardCardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !dragEnabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription={dragEnabled ? 'Sürüklenebilir fırsat kartı' : undefined}
      aria-label={`${card.title}, ${formatAmount(card.amount, card.currency)}`}
      onClick={() => navigate(`/deals/${card.id}`)}
      className={cn(
        CARD_BASE_CLASSES,
        'shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        // Sürüklenen kartın yerinde bıraktığı boşluk: kart `DragOverlay`de zaten
        // görünüyor, aslını da tam opaklıkta çizmek aynı kartı iki kez gösterirdi.
        isDragging && 'opacity-40',
        // Başkasının taşıdığı kart 2 saniye belirgin kalır. Nabız animasyonu
        // `motion-reduce` altında kapanır; renk vurgusu bilgi taşıdığı için kalır.
        movedBy && 'ring-2 ring-primary animate-pulse motion-reduce:animate-none'
      )}
    >
      <DealCardBody card={card} movedBy={movedBy} />
    </div>
  )
}

/** `DragOverlay` içeriği — etkileşimsiz, yalnızca görsel kopya. */
export function DealCardPreview({ card }: { card: DealCard }) {
  return (
    <div className={cn(CARD_BASE_CLASSES, 'shadow-popover cursor-grabbing')} aria-hidden="true">
      <DealCardBody card={card} isOverlay />
    </div>
  )
}
