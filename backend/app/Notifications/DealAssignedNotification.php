<?php

namespace App\Notifications;

use App\Models\Deal;
use App\Models\User;
use App\Notifications\Support\Money;

/**
 * `deal.assigned` — bir fırsatın `owner_id`'si yeni (ve dolu) bir kullanıcıya
 * ayarlandığında `App\Observers\Notifications\DealNotificationObserver`
 * tarafından üretilir.
 */
class DealAssignedNotification extends CrmNotification
{
    public static function make(Deal $deal, ?User $actor): self
    {
        return new self(
            recipientId: (int) $deal->owner_id,
            notificationType: 'deal.assigned',
            notificationTitle: 'Size bir fırsat atandı',
            notificationBody: sprintf(
                '%s — %s',
                $deal->company?->name ?? $deal->title,
                Money::format((string) $deal->amount, (string) $deal->currency),
            ),
            notificationLink: '/deals/'.$deal->getKey(),
            meta: [
                'deal_id' => (int) $deal->getKey(),
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }
}
