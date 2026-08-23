<?php

namespace Database\Factories;

use App\Models\Quote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quote>
 *
 * Totals (subtotal, discount_amount, tax_amount, total) are zero by design —
 * the seeder recomputes them from the related quote_items.
 */
class QuoteFactory extends Factory
{
    protected $model = Quote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'quote_number' => 'QTE-'.str_pad((string) fake()->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'title' => fake()->randomElement([
                'Yıllık Lisans Teklifi',
                'Kurumsal Entegrasyon Teklifi',
                'CRM Uygulama Teklifi',
                'Bakım ve Destek Teklifi',
                'Eğitim Hizmetleri Teklifi',
                'Bulut Altyapı Teklifi',
            ]).' - '.fake()->company(),
            'deal_id' => null,
            'company_id' => null,
            'contact_id' => null,
            'status' => 'draft',
            'valid_until' => fake()->dateTimeBetween('+15 days', '+60 days'),
            'subtotal' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total' => 0,
            'currency' => 'TRY',
            'notes' => fake()->text(150),
            'terms' => 'Ödeme, faturanın kesildiği tarihten itibaren 30 gün içinde yapılmalıdır. Teklif, geçerlilik süresi sonunda otomatik olarak sona erer.',
            'sent_at' => null,
            'accepted_at' => null,
            'rejected_at' => null,
            'created_by' => null,
        ];
    }

    /**
     * Indicate that the quote has been sent.
     */
    public function sent(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'sent',
            'sent_at' => fake()->dateTimeBetween('-30 days', '-1 days'),
        ]);
    }

    /**
     * Indicate that the quote has been accepted.
     */
    public function accepted(): static
    {
        return $this->state(function (array $attributes) {
            $sentAt = fake()->dateTimeBetween('-30 days', '-5 days');

            return [
                'status' => 'accepted',
                'sent_at' => $sentAt,
                'accepted_at' => fake()->dateTimeBetween($sentAt, 'now'),
            ];
        });
    }

    /**
     * Indicate that the quote has been rejected.
     */
    public function rejected(): static
    {
        return $this->state(function (array $attributes) {
            $sentAt = fake()->dateTimeBetween('-30 days', '-5 days');

            return [
                'status' => 'rejected',
                'sent_at' => $sentAt,
                'rejected_at' => fake()->dateTimeBetween($sentAt, 'now'),
            ];
        });
    }

    /**
     * Indicate that the quote has expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'expired',
            'sent_at' => fake()->dateTimeBetween('-90 days', '-31 days'),
            'valid_until' => fake()->dateTimeBetween('-30 days', '-1 days'),
        ]);
    }
}
