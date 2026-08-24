<?php

namespace App\Notifications;

use App\Events\TaskReminderDue;

/**
 * `task.reminder` — `App\Events\TaskReminderDue` her yayınlandığında
 * (`tasks:dispatch-reminders`, dakikalık) `App\Listeners\Notifications\
 * SendTaskReminderNotification` tarafından görevin atandığı kişiye üretilir.
 *
 * Zamanlanmış bir komuttan geldiği için bir "eylemi yapan kişi" (actor) YOK —
 * `NotificationDispatcher`'ın kendine-bildirim-gitmez kontrolü bu yüzden hiç
 * devreye girmez (actor null verilir), yalnızca alıcının aktif olup olmadığı
 * kontrol edilir.
 *
 * @see TaskReminderDue Payload alanları için (task_id, title,
 *      due_at, priority, taskable_type, taskable_id, taskable_label).
 */
class TaskReminderNotification extends CrmNotification
{
    /**
     * @param  array<string, mixed>  $payload  bkz. TaskReminderDue::$payload
     */
    public static function make(int $assignedTo, array $payload): self
    {
        $label = $payload['taskable_label'] ?? null;

        return new self(
            recipientId: $assignedTo,
            notificationType: 'task.reminder',
            notificationTitle: 'Görev hatırlatması',
            notificationBody: $label !== null
                ? sprintf('%s — %s', $payload['title'], $label)
                : (string) $payload['title'],
            notificationLink: '/tasks/'.$payload['task_id'],
            meta: [
                'task_id' => $payload['task_id'],
                'priority' => $payload['priority'] ?? null,
                'due_at' => $payload['due_at'] ?? null,
                'taskable_type' => $payload['taskable_type'] ?? null,
                'taskable_id' => $payload['taskable_id'] ?? null,
            ],
        );
    }
}
