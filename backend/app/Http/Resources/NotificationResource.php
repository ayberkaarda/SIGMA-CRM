<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * `Illuminate\Notifications\DatabaseNotification` satırını, `data`
 * sütununda saklanan Faz 10 payload sözleşmesinin (type/title/body/link/meta
 * — bkz. `App\Notifications\CrmNotification::toArray()`) etrafına ince bir
 * zarf geçirerek döner.
 *
 * @mixin DatabaseNotification
 */
class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $data */
        $data = $this->data ?? [];

        return [
            'id' => $this->id,
            'type' => $data['type'] ?? null,
            'title' => $data['title'] ?? null,
            'body' => $data['body'] ?? null,
            'link' => $data['link'] ?? null,
            'meta' => $data['meta'] ?? [],
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
