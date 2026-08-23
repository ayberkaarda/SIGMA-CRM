<?php

namespace Database\Factories;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attachment>
 *
 * Demo/test satırları — diskte gerçek dosya karşılığı yoktur.
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $filename = fake()->uuid().'.pdf';

        return [
            'filename' => $filename,
            'original_name' => fake()->randomElement([
                'Teklif_Formu',
                'Sözleşme_Taslağı',
                'Fatura_Örneği',
                'Ürün_Kataloğu',
                'Toplantı_Notları',
                'Proje_Planı',
            ]).'.'.fake()->randomElement(['pdf', 'docx', 'xlsx']),
            'mime_type' => fake()->randomElement([
                'application/pdf',
                'image/png',
                'image/jpeg',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
            ]),
            'size' => fake()->numberBetween(10240, 8388608),
            'disk' => 'local',
            'path' => 'attachments/demo/'.$filename,
            'attachable_type' => null,
            'attachable_id' => null,
            'uploaded_by' => null,
        ];
    }
}
