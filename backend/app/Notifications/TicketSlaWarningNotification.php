<?php

namespace App\Notifications;

use App\Events\TicketSlaWarning;

/**
 * `ticket.sla_warning` — `App\Events\TicketSlaWarning` her yayınlandığında
 * (`tickets:scan-sla`, 5 dakikada bir) `App\Listeners\Notifications\
 * SendTicketSlaWarningNotification` tarafından ticket'ın atandığı kişiye
 * üretilir. `assigned_to` NULL ise (atanmamış ticket) gönderilecek kimse
 * yoktur — listener bu durumda hiç bildirim üretmez.
 *
 * Zamanlanmış bir tarayıcıdan geldiği için actor YOKTUR.
 *
 * @see TicketSlaWarning::payload() Payload alanları için.
 */
class TicketSlaWarningNotification extends CrmNotification
{
    public static function make(int $assignedTo, string $ticketNumber, string $subject, int $ticketId, int $remainingSeconds): self
    {
        return new self(
            recipientId: $assignedTo,
            notificationType: 'ticket.sla_warning',
            notificationTitle: 'SLA süresi azalıyor',
            notificationBody: sprintf(
                '%s — %s (kalan ~%d dk)',
                $ticketNumber,
                $subject,
                (int) round($remainingSeconds / 60),
            ),
            notificationLink: '/tickets/'.$ticketId,
            meta: [
                'ticket_id' => $ticketId,
                'remaining_seconds' => $remainingSeconds,
            ],
        );
    }
}
