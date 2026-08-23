<?php

namespace App\Http\Resources;

use App\Models\CustomField;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read CustomField $resource
 */
class CustomFieldResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CustomField $field */
        $field = $this->resource;

        return [
            'id' => $field->id,
            'entity_type' => $field->entity_type,
            'name' => $field->name,
            'key' => $field->key,
            'type' => $field->type,
            'options' => $field->options,
            'is_required' => (bool) $field->is_required,
            'position' => $field->position,
        ];
    }
}
