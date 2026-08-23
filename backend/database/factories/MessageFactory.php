<?php

namespace Database\Factories;

use App\Models\Message;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 *
 * conversation_id is NOT NULL at the database level. It is left null in
 * definition() by design — the caller/seeder must always supply it,
 * e.g. Message::factory()->create(['conversation_id' => $conversation->id]).
 */
class MessageFactory extends Factory
{
    protected $model = Message::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'conversation_id' => null,
            'user_id' => null,
            'body' => fake()->randomElement([
                'Merhaba, teklifle ilgili son durumu paylaşabilir misiniz?',
                'Müşteri görüşmesi yarın saat 14:00\'te.',
                'Sözleşme taslağını ekledim, kontrol eder misiniz?',
                'Bu fırsatı öncelikli listeye aldım.',
                'Fatura kesildi, muhasebeye ilettim.',
                'Ürün demo talebi geldi, planlayalım.',
                'Destek talebi çözüldü, müşteri onayladı.',
                'Toplantı notlarını CRM\'e ekledim.',
                'Yeni lead atandı, ilgilenir misin?',
                'Ödeme henüz yapılmamış, hatırlatma gönderelim.',
                'Teklif süresi bu hafta doluyor.',
                'Görüşme iyi geçti, bir sonraki adımı planlıyoruz.',
            ]),
            'attachment_id' => null,
            'type' => 'text',
            'edited_at' => null,
        ];
    }

    /**
     * Indicate that the message is a system message.
     */
    public function system(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'system',
        ]);
    }

    /**
     * Indicate that the message has been edited.
     */
    public function edited(): static
    {
        return $this->state(fn (array $attributes) => [
            'edited_at' => fake()->dateTimeBetween('-7 days', 'now'),
        ]);
    }
}
