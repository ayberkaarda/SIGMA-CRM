<?php

namespace Database\Factories;

use App\Models\Activity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(['call', 'email', 'meeting', 'note', 'task', 'visit']),
            'subject' => fake()->randomElement([
                'Müşteri görüşmesi', 'Teklif sunumu', 'Sözleşme görüşmesi', 'Bilgilendirme',
                'Şikayet takibi', 'Ürün tanıtımı', 'Fiyat görüşmesi', 'Genel değerlendirme',
            ]),
            'body' => fake('tr_TR')->text(200),
            'occurred_at' => fake()->dateTimeBetween('-6 months', 'now'),
            'duration_minutes' => fake()->boolean(60) ? fake()->numberBetween(5, 120) : null,
            'outcome' => fake()->boolean(70) ? fake()->randomElement([
                'successful', 'no_answer', 'rescheduled', 'follow_up', 'not_interested',
            ]) : null,
            'user_id' => null,
            'activityable_type' => null,
            'activityable_id' => null,
        ];
    }

    /**
     * Indicate that the activity is a phone call.
     */
    public function call(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'call',
            'subject' => 'Telefon görüşmesi',
        ]);
    }

    /**
     * Indicate that the activity is an email.
     */
    public function email(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'email',
            'subject' => 'E-posta yazışması',
        ]);
    }

    /**
     * Indicate that the activity is a meeting.
     */
    public function meeting(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'meeting',
            'subject' => 'Yüz yüze toplantı',
        ]);
    }

    /**
     * Indicate that the activity is a note.
     */
    public function note(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'note',
            'subject' => 'Not eklendi',
        ]);
    }
}
