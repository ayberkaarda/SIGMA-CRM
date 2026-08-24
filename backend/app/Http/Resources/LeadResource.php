<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ExposesAbilities;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read Lead $resource
 */
class LeadResource extends JsonResource
{
    use ExposesAbilities;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Lead $lead */
        $lead = $this->resource;

        return [
            'id' => $lead->id,
            'first_name' => $lead->first_name,
            'last_name' => $lead->last_name,
            'full_name' => trim("{$lead->first_name} {$lead->last_name}"),
            'email' => $lead->email,
            'phone' => $lead->phone,
            'company_name' => $lead->company_name,
            'position' => $lead->position,
            'source' => $lead->source,
            'status' => $lead->status,
            'score' => $lead->score,
            'notes' => $lead->notes,
            'owner' => $lead->owner ? [
                'id' => $lead->owner->id,
                'name' => $lead->owner->name,
            ] : null,
            'tags' => $lead->relationLoaded('tags')
                ? $lead->tags->map(fn ($tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'color' => $tag->color,
                ])->values()
                : [],
            'custom_fields' => $lead->relationLoaded('customFieldValues')
                ? $lead->customFieldValues
                    ->mapWithKeys(fn ($value) => [$value->customField->key => $value->value])
                    ->all()
                : [],
            'converted_at' => $lead->converted_at?->toIso8601String(),
            'converted_contact_id' => $lead->converted_contact_id,
            'converted_company_id' => $lead->converted_company_id,
            'converted_deal_id' => $lead->converted_deal_id,
            'created_at' => $lead->created_at?->toIso8601String(),
            'updated_at' => $lead->updated_at?->toIso8601String(),
            // Bu kullanıcının bu kayıtta neyi YAPABİLDİĞİ — arayüz kuralı
            // yeniden yazmasın (gerekçe: ExposesAbilities).
            'can' => $this->abilities($request, $lead, [
                'update' => 'update',
                'convert' => 'convert',
                'delete' => 'delete',
                'assign' => 'assign',
            ]),
        ];
    }
}
