<?php

namespace Database\Factories;

use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => 'dm',
            'name' => null,
            'conversable_type' => null,
            'conversable_id' => null,
            'created_by' => null,
            'last_message_at' => null,
        ];
    }

    /**
     * Indicate that the conversation is a direct message.
     */
    public function dm(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'dm',
            'name' => null,
        ]);
    }

    /**
     * Indicate that the conversation is a group chat.
     */
    public function group(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'group',
            'name' => fake()->randomElement([
                'Satış Ekibi',
                'Destek Vardiyası',
                'Proje Koordinasyon',
                'Yönetim',
            ]),
        ]);
    }

    /**
     * Indicate that the conversation is attached to a record.
     * The conversable_* columns are wired by the seeder.
     */
    public function record(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'record',
            'name' => null,
        ]);
    }
}
