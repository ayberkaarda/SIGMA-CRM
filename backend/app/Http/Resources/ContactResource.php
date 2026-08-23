<?php

namespace App\Http\Resources;

use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read Contact $resource
 */
class ContactResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Contact $contact */
        $contact = $this->resource;

        return [
            'id' => $contact->id,
            'first_name' => $contact->first_name,
            'last_name' => $contact->last_name,
            'full_name' => $contact->full_name,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'mobile' => $contact->mobile,
            'position' => $contact->position,
            'is_primary' => $contact->is_primary,
            'address' => $contact->address,
            'city' => $contact->city,
            'country' => $contact->country,
            'notes' => $contact->notes,
            'company' => $contact->relationLoaded('company') && $contact->company
                ? ['id' => $contact->company->id, 'name' => $contact->company->name]
                : null,
            'owner' => $contact->relationLoaded('owner') && $contact->owner
                ? ['id' => $contact->owner->id, 'name' => $contact->owner->name]
                : null,
            'tags' => $contact->relationLoaded('tags')
                ? $contact->tags->map(fn ($tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'color' => $tag->color,
                ])->values()
                : [],
            'custom_fields' => $contact->relationLoaded('customFieldValues')
                ? $contact->customFieldValues
                    ->mapWithKeys(fn ($value) => [$value->customField->key => $value->value])
                    ->all()
                : [],
            // withCount ile yüklendiyse görünür (detay ucu); listede sessizce atlanır.
            'deals_count' => $this->whenCounted('deals'),
            'tickets_count' => $this->whenCounted('tickets'),
            'created_at' => $contact->created_at?->toIso8601String(),
            'updated_at' => $contact->updated_at?->toIso8601String(),
        ];
    }
}
