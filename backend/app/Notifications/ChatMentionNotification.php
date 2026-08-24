<?php

namespace App\Notifications;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * `chat.mention` — bir mesajda `mentions` dizisiyle işaretlenen kullanıcıya
 * (Faz 12).
 *
 * Faz 10'un `CrmNotification` taban sınıfı OLDUĞU GİBİ kullanılır: payload
 * sözleşmesi (`type`/`title`/`body`/`link`/`meta`), `via()` sırası
 * (`database` önce, `broadcast` sonra — `unread_count` bir eksik gelmesin),
 * `afterCommit()` ve `broadcastOn()` mantığı orada bir kez çözülmüştür ve
 * burada yeniden yazılmaz. Bu sınıfın tek işi kendi dört metnini üretmektir.
 *
 * -----------------------------------------------------------------------------
 * `body` NEDEN MESAJIN KENDİSİ (KIRPILMIŞ)
 * -----------------------------------------------------------------------------
 * "Sizden bahsedildi" tek başına kullanıcıyı sohbeti açmaya zorlar. Bildirim
 * merkezinde mesajın ilk satırını görmek, çoğu durumda tıklamayı gereksiz
 * kılar. Kırpma sunucuda yapılır: `notifications.data` bir JSON kolonudur ve
 * 5.000 karakterlik bir mesajı oraya kopyalamak, bildirim listesini mesaj
 * tablosunun ikinci bir kopyasına dönüştürürdü.
 *
 * Dosya mesajlarında gövde boş olabilir; o durumda dosya adı ya da sabit bir
 * ifade kullanılır — boş bir bildirim satırı göstermek yerine.
 */
class ChatMentionNotification extends CrmNotification
{
    /**
     * Bildirim gövdesindeki mesaj alıntısının karakter sınırı.
     */
    public const BODY_LIMIT = 160;

    public static function make(
        int $recipientId,
        Message $message,
        Conversation $conversation,
        ?User $actor,
    ): self {
        $where = $conversation->isGroup() && $conversation->name !== null
            ? sprintf(' (%s)', $conversation->name)
            : '';

        return new self(
            recipientId: $recipientId,
            notificationType: 'chat.mention',
            notificationTitle: sprintf('%s sizden bahsetti%s', $actor?->name ?? 'Bir kullanıcı', $where),
            notificationBody: self::excerpt($message),
            // Faz 12 arayüz yolu — sohbet ekranı konuşmayı id ile açar.
            notificationLink: '/chat/'.$conversation->getKey(),
            meta: [
                'conversation_id' => (int) $conversation->getKey(),
                'conversation_type' => $conversation->type,
                'message_id' => (int) $message->getKey(),
                'actor_id' => $actor?->getKey(),
                'actor_name' => $actor?->name,
            ],
        );
    }

    private static function excerpt(Message $message): string
    {
        $body = trim((string) $message->body);

        if ($body !== '') {
            return Str::limit($body, self::BODY_LIMIT);
        }

        if ($message->attachment !== null) {
            return (string) $message->attachment->original_name;
        }

        return 'Bir dosya paylaştı.';
    }
}
