<?php

namespace App\Notifications;

use App\Models\Quote;
use App\Models\User;

/**
 * `quote.status_changed` — bir teklifin `status`'ü değiştiğinde
 * `App\Observers\Notifications\QuoteNotificationObserver` tarafından
 * teklifin OLUŞTURANINA (`created_by`) üretilir.
 *
 * Quote'ta ayrı bir "sahip/atanan" alanı yok — yalnızca `created_by` (bkz.
 * migration). Bu yüzden alıcı, DealController/TicketController'daki gibi bir
 * "owner"/"assignee" değil, teklifi oluşturan kullanıcıdır: durum
 * `sent → accepted/rejected/expired` değiştiğinde asıl ilgilenen kişi
 * teklifi hazırlayan kişidir.
 */
class QuoteStatusChangedNotification extends CrmNotification
{
    public static function make(Quote $quote, string $fromStatus, ?User $actor): self
    {
        return new self(
            recipientId: (int) $quote->created_by,
            notificationType: 'quote.status_changed',
            notificationTitle: 'Teklif durumu değişti',
            notificationBody: sprintf(
                '%s — %s',
                $quote->quote_number,
                self::statusLabel((string) $quote->status),
            ),
            notificationLink: '/quotes/'.$quote->getKey(),
            meta: [
                'quote_id' => (int) $quote->getKey(),
                'from_status' => $fromStatus,
                'to_status' => $quote->status,
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }

    private static function statusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'Taslak',
            'sent' => 'Gönderildi',
            'accepted' => 'Kabul edildi',
            'rejected' => 'Reddedildi',
            'expired' => 'Süresi doldu',
            default => $status,
        };
    }
}
