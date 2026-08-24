<?php

namespace App\Notifications;

use App\Events\TicketSlaBreached;

/**
 * `ticket.sla_breached` — `App\Events\TicketSlaBreached` her yayınlandığında
 * (`tickets:scan-sla`, 5 dakikada bir) `App\Listeners\Notifications\
 * SendTicketSlaBreachedNotification` tarafından ticket'ın atandığı kişiye
 * üretilir. `assigned_to` NULL ise listener hiç bildirim üretmez.
 *
 * Zamanlanmış bir tarayıcıdan geldiği için actor YOKTUR.
 *
 * @see TicketSlaBreached::payload() Payload alanları için.
 */
class TicketSlaBreachedNotification extends CrmNotification
{
    public static function make(int $assignedTo, string $ticketNumber, string $subject, int $ticketId, int $overdueSeconds): self
    {
        return new self(
            recipientId: $assignedTo,
            notificationType: 'ticket.sla_breached',
            notificationTitle: 'SLA ihlal edildi',
            notificationBody: sprintf(
                '%s — %s (%d dk gecikme)',
                $ticketNumber,
                $subject,
                (int) round($overdueSeconds / 60),
            ),
            notificationLink: '/tickets/'.$ticketId,
            meta: [
                'ticket_id' => $ticketId,
                'overdue_seconds' => $overdueSeconds,
            ],
        );
    }
}
