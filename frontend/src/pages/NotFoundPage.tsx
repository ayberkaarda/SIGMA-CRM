// 404 sayfası — bilinmeyen route'lar için.
import { SearchX } from 'lucide-react'
import { EmptyState } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden="true" />}
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa mevcut değil veya taşınmış olabilir."
      />
    </div>
  )
}
