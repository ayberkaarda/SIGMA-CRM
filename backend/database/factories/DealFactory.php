<?php

namespace Database\Factories;

use App\Models\Deal;
use App\Models\PipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deal>
 */
class DealFactory extends Factory
{
    protected $model = Deal::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->randomElement([
                'Yıllık Lisans Yenileme', 'CRM Kurulum Projesi', 'Donanım Tedariki', 'Bakım Anlaşması',
                'Danışmanlık Hizmeti', 'Yazılım Geliştirme', 'Bulut Migrasyonu', 'Eğitim Paketi',
            ]).' - '.fake('tr_TR')->company(),
            'description' => fake('tr_TR')->text(200),
            'amount' => fake()->randomFloat(2, 5000, 500000),
            'currency' => 'TRY',
            'pipeline_stage_id' => PipelineStage::query()->where('is_won', false)->where('is_lost', false)->inRandomOrder()->value('id')
                ?? PipelineStage::factory(),
            'position' => 'a'.str_pad(base_convert((string) fake()->unique()->numberBetween(0, 46655), 10, 36), 4, '0', STR_PAD_LEFT),
            'version' => 1,
            'probability' => null,
            'expected_close_date' => fake()->dateTimeBetween('now', '+4 months'),
            'closed_at' => null,
            'status' => 'open',
            'lost_reason' => null,
            'won_reason' => null,
            'company_id' => null,
            'contact_id' => null,
            'owner_id' => null,
        ];
    }

    /**
     * Indicate that the deal was won.
     */
    public function won(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'won',
            'closed_at' => fake()->dateTimeBetween('-3 months', 'now'),
            'won_reason' => fake('tr_TR')->sentence(6),
            'lost_reason' => null,
            'probability' => 100,
            'pipeline_stage_id' => PipelineStage::query()->where('is_won', true)->value('id')
                ?? PipelineStage::factory()->won(),
        ]);
    }

    /**
     * Indicate that the deal was lost.
     */
    public function lost(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'lost',
            'closed_at' => fake()->dateTimeBetween('-3 months', 'now'),
            'lost_reason' => fake()->randomElement([
                'Fiyat yüksek bulundu', 'Rakip firma tercih edildi', 'Bütçe onaylanmadı',
                'Proje ertelendi', 'İhtiyaç ortadan kalktı',
            ]),
            'won_reason' => null,
            'probability' => 0,
            'pipeline_stage_id' => PipelineStage::query()->where('is_lost', true)->value('id')
                ?? PipelineStage::factory()->lost(),
        ]);
    }

    /**
     * Indicate that the deal is still open.
     */
    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'open',
            'closed_at' => null,
            'lost_reason' => null,
            'won_reason' => null,
        ]);
    }
}
