<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Models\User;

/**
 * `lead.assigned` — bir adayın `owner_id`'si yeni (ve dolu) bir kullanıcıya
 * ayarlandığında `App\Observers\Notifications\LeadNotificationObserver`
 * tarafından üretilir.
 *
 * CSV toplu içe aktarma sırasında (`LeadImportService`) bildirim yağmuru
 * `NotificationDispatcher`'daki `ActivityLogStatus` kontrolüyle önlenir —
 * bkz. o sınıfın dokümanı.
 */
class LeadAssignedNotification extends CrmNotification
{
    public static function make(Lead $lead, ?User $actor): self
    {
        $person = trim($lead->first_name.' '.$lead->last_name);

        return new self(
            recipientId: (int) $lead->owner_id,
            notificationType: 'lead.assigned',
            notificationTitle: 'Size bir aday atandı',
            notificationBody: $lead->company_name !== null && $lead->company_name !== ''
                ? sprintf('%s — %s', $person, $lead->company_name)
                : $person,
            notificationLink: '/leads/'.$lead->getKey(),
            meta: [
                'lead_id' => (int) $lead->getKey(),
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }
}
