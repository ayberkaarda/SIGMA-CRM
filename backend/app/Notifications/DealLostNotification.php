<?php

namespace App\Notifications;

use App\Models\Deal;
use App\Models\User;
use App\Notifications\Support\Money;

/**
 * `deal.lost` — bir fırsatın `status`'ü `lost`'a döndüğünde
 * `App\Observers\Notifications\DealNotificationObserver` tarafından fırsatın
 * SAHİBİNE üretilir.
 */
class DealLostNotification extends CrmNotification
{
    public static function make(Deal $deal, ?User $actor): self
    {
        return new self(
            recipientId: (int) $deal->owner_id,
            notificationType: 'deal.lost',
            notificationTitle: 'Fırsat kaybedildi',
            notificationBody: sprintf(
                '%s — %s',
                $deal->company?->name ?? $deal->title,
                Money::format((string) $deal->amount, (string) $deal->currency),
            ),
            notificationLink: '/deals/'.$deal->getKey(),
            meta: [
                'deal_id' => (int) $deal->getKey(),
                'lost_reason' => $deal->lost_reason,
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }
}
