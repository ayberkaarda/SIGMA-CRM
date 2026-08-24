<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;

/**
 * `task.assigned` — bir görevin `assigned_to`'su yeni (ve dolu) bir
 * kullanıcıya ayarlandığında
 * `App\Observers\Notifications\TaskNotificationObserver` tarafından üretilir.
 */
class TaskAssignedNotification extends CrmNotification
{
    public static function make(Task $task, ?User $actor): self
    {
        $dueLabel = $task->due_at?->translatedFormat('d M Y H:i');

        return new self(
            recipientId: (int) $task->assigned_to,
            notificationType: 'task.assigned',
            notificationTitle: 'Size bir görev atandı',
            notificationBody: $dueLabel !== null
                ? sprintf('%s — vade %s', $task->title, $dueLabel)
                : $task->title,
            notificationLink: '/tasks/'.$task->getKey(),
            meta: [
                'task_id' => (int) $task->getKey(),
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }
}
