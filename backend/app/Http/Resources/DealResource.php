<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ExposesAbilities;
use App\Models\Deal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Detay görünümü — `GET /api/deals/{deal}`, `POST /api/deals`,
 * `PATCH /api/deals/{deal}`, `PATCH /api/deals/{deal}/assign`.
 *
 * DealCardResource'un tüm alanlarını içerir + `description`, `lost_reason`,
 * `won_reason`, `closed_at`, tam `pipeline_stage`, `custom_fields`,
 * zaman damgaları.
 *
 * @property-read Deal $resource
 */
class DealResource extends JsonResource
{
    use ExposesAbilities;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Deal $deal */
        $deal = $this->resource;

        return [
            'id' => $deal->id,
            'title' => $deal->title,
            'description' => $deal->description,
            'amount' => (float) $deal->amount,
            'currency' => $deal->currency,
            'position' => $deal->position,
            'version' => $deal->version,
            'probability' => $deal->probability,
            'expected_close_date' => $deal->expected_close_date?->toDateString(),
            'status' => $deal->status,
            'lost_reason' => $deal->lost_reason,
            'won_reason' => $deal->won_reason,
            'closed_at' => $deal->closed_at?->toIso8601String(),
            'pipeline_stage' => $deal->relationLoaded('pipelineStage') && $deal->pipelineStage
                ? new PipelineStageResource($deal->pipelineStage)
                : null,
            'company' => $deal->relationLoaded('company') && $deal->company
                ? ['id' => $deal->company->id, 'name' => $deal->company->name]
                : null,
            'contact' => $deal->relationLoaded('contact') && $deal->contact
                ? ['id' => $deal->contact->id, 'full_name' => $deal->contact->full_name]
                : null,
            'owner' => $deal->relationLoaded('owner') && $deal->owner
                ? ['id' => $deal->owner->id, 'name' => $deal->owner->name]
                : null,
            'tags' => $deal->relationLoaded('tags')
                ? $deal->tags->map(fn ($tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'color' => $tag->color,
                ])->values()
                : [],
            'custom_fields' => $deal->relationLoaded('customFieldValues')
                ? $deal->customFieldValues
                    ->mapWithKeys(fn ($value) => [$value->customField->key => $value->value])
                    ->all()
                : [],
            'is_overdue' => $deal->status === 'open'
                && $deal->expected_close_date !== null
                && $deal->expected_close_date->lt(today()),
            'created_at' => $deal->created_at?->toIso8601String(),
            'updated_at' => $deal->updated_at?->toIso8601String(),
            // Bu kullanıcının bu kayıtta neyi YAPABİLDİĞİ — arayüz kuralı
            // yeniden yazmasın (gerekçe: ExposesAbilities).
            'can' => $this->abilities($request, $deal, [
                'update' => 'update',
                'move' => 'move',
                'delete' => 'delete',
                'assign' => 'assign',
            ]),
        ];
    }
}
