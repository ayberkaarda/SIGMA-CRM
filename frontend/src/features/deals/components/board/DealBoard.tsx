// Sürükle-bırak bağlamı ve sütun şeridi.
//
// `closestCorners`: çok kapsayıcılı (multi-container) sortable için doğru toplayıcı.
// `closestCenter` dar ve uzun sütunlarda, imleç komşu sütunun üzerindeyken bile kendi
// sütunundaki bir kartı "en yakın" bulup kartın sütun değiştirmesini engeller.
//
// `MeasuringStrategy.Always`: kartlar sürükleme sırasında yer değiştirdiği için sütun
// kutuları sürekli değişir. Varsayılan strateji ölçümü sürüklemenin başında dondurur ve
// uzun sütunlarda bırakma hedefi kaymış rect'lere göre hesaplanır.
import { DndContext, DragOverlay, MeasuringStrategy, closestCorners } from '@dnd-kit/core'
import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core'
import { parseColumnId } from '../../hooks/useDealBoard'
import { BoardStageColumn } from './BoardStageColumn'
import { DealCardPreview } from './DealBoardCard'
import type { UseDealBoardResult } from '../../hooks/useDealBoard'
import type { BoardResponse } from '../../types'

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Bir fırsat kartını klavyeyle taşımak için boşluk veya enter tuşuna basarak kartı alın. ' +
    'Ok tuşlarıyla kartı aşamalar arasında ve aşama içinde taşıyın. ' +
    'Bırakmak için tekrar boşluk veya enter tuşuna, iptal etmek için escape tuşuna basın.',
}

function cardTitle(board: BoardResponse, id: string | number): string {
  for (const column of board.data) {
    const deal = column.deals.find((entry) => String(entry.id) === String(id))
    if (deal) return deal.title
  }
  return 'Kart'
}

function stageName(board: BoardResponse, overId: string | number | undefined): string | null {
  if (overId === undefined) return null
  const stageId = parseColumnId(overId)
  if (stageId !== null) {
    return board.data.find((column) => column.stage.id === stageId)?.stage.name ?? null
  }
  const raw = String(overId)
  const column = board.data.find((entry) => entry.deals.some((deal) => String(deal.id) === raw))
  return column?.stage.name ?? null
}

export type DealBoardProps = {
  board: BoardResponse
  dnd: UseDealBoardResult
  dragEnabled: boolean
  canCreate: boolean
  onCreate: (stageId: number) => void
  recentlyMoved: Record<number, string>
}

export function DealBoard({
  board,
  dnd,
  dragEnabled,
  canCreate,
  onCreate,
  recentlyMoved,
}: DealBoardProps) {
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${cardTitle(board, active.id)} kartı alındı. Ok tuşlarıyla taşıyın.`,
    onDragOver: ({ active, over }) => {
      const stage = stageName(board, over?.id)
      return stage
        ? `${cardTitle(board, active.id)} kartı ${stage} aşamasının üzerinde.`
        : `${cardTitle(board, active.id)} kartı bırakılabilir bir alanın dışında.`
    },
    onDragEnd: ({ active, over }) => {
      const stage = stageName(board, over?.id)
      return stage
        ? `${cardTitle(board, active.id)} kartı ${stage} aşamasına bırakıldı.`
        : `${cardTitle(board, active.id)} kartı eski konumuna geri alındı.`
    },
    onDragCancel: ({ active }) =>
      `${cardTitle(board, active.id)} kartının taşınması iptal edildi.`,
  }

  return (
    <DndContext
      sensors={dnd.sensors}
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={dnd.onDragStart}
      onDragOver={dnd.onDragOver}
      onDragEnd={dnd.onDragEnd}
      onDragCancel={dnd.onDragCancel}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {board.data.map((column) => (
          <BoardStageColumn
            key={column.stage.id}
            column={column}
            currency={board.meta.currency}
            dragEnabled={dragEnabled}
            canCreate={canCreate}
            onCreate={onCreate}
            recentlyMoved={recentlyMoved}
          />
        ))}
      </div>

      <DragOverlay>{dnd.activeCard ? <DealCardPreview card={dnd.activeCard} /> : null}</DragOverlay>
    </DndContext>
  )
}
