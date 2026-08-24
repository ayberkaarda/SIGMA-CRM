<?php

namespace App\Notifications;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Faz 10 payload sözleşmesindeki 5 anahtarı ({@see self::toArray()}) tüm 11
 * bildirim tipi için TEK yerde üretir; her alt sınıf yalnızca kendi
 * title/body/link/meta'sını hesaplar.
 *
 * ---------------------------------------------------------------------------
 * `broadcastOn()` NEDEN `$recipientId`'Yİ CONSTRUCTOR'DAN ALIYOR
 * ---------------------------------------------------------------------------
 * `Illuminate\Notifications\Events\BroadcastNotificationCreated::broadcastOn()`
 * (vendor kaynağı okunarak doğrulandı) alıcıyı (`$notifiable`) DEĞİL, doğrudan
 * `$this->notification->broadcastOn()`'u parametresiz çağırır — yani bu
 * metodun `$notifiable`'a erişimi YOKTUR. Kanal adını üretmek için alıcının
 * id'si dispatch anında (constructor'da) yakalanıp saklanır. `toDatabase()` /
 * `toBroadcast()` ise `$notifiable` parametresini gerçekten alır (Laravel
 * kanal sözleşmesi), o yüzden onlarda ayrıca saklamaya gerek yok.
 *
 * ---------------------------------------------------------------------------
 * `afterCommit()` NEDEN CONSTRUCTOR'DA ZORUNLU
 * ---------------------------------------------------------------------------
 * Bu bildirimler `ShouldQueue` + `QUEUE_CONNECTION=redis`; tetikleyen
 * observer/listener çoğu zaman bir DB transaction'ı İÇİNDE çalışır (ör.
 * `DealMoveService::move()` — `$deal->save()` transaction içinde,
 * `broadcast(new DealMoved(...))` bilinçli olarak transaction DIŞINDA
 * çağrılıyor, aynı derste). `config/queue.php`'de her bağlantı için
 * `after_commit => false` (proje genelinde), yani varsayılan davranışta
 * kuyruğa itilen job, MySQL commit'inden ÖNCE Redis işçisi tarafından
 * alınabilir. `afterCommit()` bu job'u özel olarak "transaction commit
 * olmadan kuyruğa gitme" moduna sokar — DealMoved'in "yayın transaction
 * dışında" prensibiyle aynı sorunun, dispatch noktası servis metodunun
 * kontrolünde OLMADIĞI (observer/listener) için farklı bir çözümüdür.
 *
 * ---------------------------------------------------------------------------
 * `via()` SIRASI: `database` ÖNCE, `broadcast` SONRA
 * ---------------------------------------------------------------------------
 * `Illuminate\Notifications\NotificationSender::sendToNotifiable()` kanalları
 * `via()`'nın döndürdüğü SIRAYLA, aynı job içinde SENKRON işler. Sözleşme
 * `toBroadcast()`'in `unread_count`'u "bu kullanıcının GÜNCEL okunmamış
 * sayısı" olarak tanımlıyor — yani az önce yazılan satır da dahil. `database`
 * önce çalışmazsa sayaç bir eksik gelir.
 */
abstract class CrmNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * NOT `readonly`: `Illuminate\Queue\SerializesModels::__unserialize()`
     * (vendor kaynağı okunarak doğrulandı) her özelliği `ReflectionProperty::
     * setValue()` ile geri yükler. PHP'nin queue payload'ı `serialize()`/
     * `unserialize()` ile üretilmesi (bkz. `Illuminate\Queue\Queue::
     * createObjectPayload()` — `QUEUE_CONNECTION=sync` DAHİL, sürücüden
     * bağımsız çalışır) alt sınıfta (`DealAssignedNotification` vb.) somut
     * hâle gelen bir nesneyi geri kurar; bu durumda Reflection'ın "hangi
     * scope'tan yazılıyor" kontrolü nesnenin ÇALIŞMA ZAMANI sınıfına
     * (alt sınıf) bakar, `readonly` özelliğin TANIMLANDIĞI sınıfa
     * (`CrmNotification`) değil — ve "Cannot initialize readonly property
     * ...\CrmNotification::$recipientId from scope ...\DealAssignedNotification"
     * hatasıyla fatal verir (küçük bir izole script ile ampirik olarak
     * doğrulandı). `readonly` yalnızca kozmetik bir savunma katmanıydı;
     * kaldırılması payload sözleşmesini DEĞİŞTİRMEZ.
     *
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        protected int $recipientId,
        protected string $notificationType,
        protected string $notificationTitle,
        protected string $notificationBody,
        protected string $notificationLink,
        protected array $meta,
    ) {
        $this->afterCommit();
    }

    /**
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Faz 10 payload sözleşmesi — tam olarak 5 anahtar.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => $this->notificationType,
            'title' => $this->notificationTitle,
            'body' => $this->notificationBody,
            'link' => $this->notificationLink,
            'meta' => $this->meta,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase($notifiable): array
    {
        return $this->toArray($notifiable);
    }

    /**
     * 5 sözleşme anahtarı + `id` (uuid) + `created_at` + `unread_count`.
     *
     * `$this->id`: `NotificationSender::sendToNotifiable()` her kanaldan ÖNCE
     * `$notification->id = $notificationId` yazar (vendor kaynağı okunarak
     * doğrulandı), yani `database` kanalındaki satırın birincil anahtarıyla
     * burası birebir aynı uuid'i taşır.
     *
     * @return array<string, mixed>
     */
    public function toBroadcast($notifiable): array
    {
        return array_merge($this->toArray($notifiable), [
            'id' => $this->id,
            'created_at' => now()->toIso8601String(),
            'unread_count' => $notifiable->unreadNotifications()->count(),
        ]);
    }

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.'.$this->recipientId)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}
