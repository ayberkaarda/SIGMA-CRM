<?php

namespace App\Notifications;

use App\Models\Ticket;
use App\Models\User;

/**
 * `ticket.assigned` — bir destek talebinin `assigned_to`'su yeni (ve dolu)
 * bir kullanıcıya ayarlandığında
 * `App\Observers\Notifications\TicketNotificationObserver` tarafından
 * üretilir.
 */
class TicketAssignedNotification extends CrmNotification
{
    public static function make(Ticket $ticket, ?User $actor): self
    {
        return new self(
            recipientId: (int) $ticket->assigned_to,
            notificationType: 'ticket.assigned',
            notificationTitle: 'Size bir destek talebi atandı',
            notificationBody: sprintf('%s — %s', $ticket->ticket_number, $ticket->subject),
            notificationLink: '/tickets/'.$ticket->getKey(),
            meta: [
                'ticket_id' => (int) $ticket->getKey(),
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }
}
