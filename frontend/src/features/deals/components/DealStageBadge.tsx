// Fırsat aşaması rozeti — `pipeline_stage.color` (sabit token adı) `tokenBadgeVariant` ile
// `Badge` varyantına çevrilir. Hex/rastgele renk KULLANILMAZ (bkz. token sözleşmesi).
import { Badge } from '../../../components/ui'
import { tokenBadgeVariant } from '../../../components/shared/tokenBadgeVariant'
import type { PipelineStage } from '../types'

export type DealStageBadgeProps = {
  stage: PipelineStage | null
}

export function DealStageBadge({ stage }: DealStageBadgeProps) {
  if (!stage) return <span className="text-sm text-fg-muted">—</span>
  return <Badge variant={tokenBadgeVariant(stage.color)}>{stage.name}</Badge>
}
