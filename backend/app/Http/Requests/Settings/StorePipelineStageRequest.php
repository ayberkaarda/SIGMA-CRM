<?php

namespace App\Http\Requests\Settings;

use App\Services\Settings\PipelineStageService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `POST /api/settings/pipeline-stages` — yetkilendirme controller'da
 * (`settings.manage`).
 *
 * `position` BURADA YOK: yeni aşama daima listenin SONUNA eklenir ve sıra
 * yalnızca `POST /api/settings/pipeline-stages/reorder` ucundan değişir. İki
 * ayrı yerden pozisyon yazılabilseydi, ekleme ile yeniden sıralama arasında
 * çelişen değerler oluşurdu.
 *
 * `is_active` de yok: yeni aşama aktif doğar. Pasifleştirme, açık fırsatların
 * ne olacağına karar vermeyi gerektiren AYRI bir işlemdir (bkz.
 * UpdatePipelineStageRequest ve PipelineStageService::deactivate()).
 */
class StorePipelineStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Verilmezse isimden üretilir (PipelineStageService::create).
            'slug' => [
                'sometimes', 'string', 'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('pipeline_stages', 'slug'),
            ],
            'probability' => ['sometimes', 'integer', 'between:0,100'],
            'color' => ['sometimes', 'nullable', Rule::in(PipelineStageService::COLORS)],
            'is_won' => ['sometimes', 'boolean'],
            'is_lost' => ['sometimes', 'boolean'],

            'position' => ['missing'],
            'is_active' => ['missing'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Aşama adı zorunludur.',
            'name.max' => 'Aşama adı en fazla :max karakter olabilir.',
            'slug.regex' => 'Slug yalnızca küçük harf, rakam ve tire içerebilir (ör. "teklif-gonderildi").',
            'slug.unique' => 'Bu slug ile bir aşama zaten var.',
            'probability.between' => 'Kazanma olasılığı 0 ile 100 arasında olmalıdır.',
            'color.in' => 'Geçersiz renk. Geçerli değerler: '.implode('|', PipelineStageService::COLORS),
            'position.missing' => 'Aşama sırası bu uçtan verilemez; yeni aşama listenin sonuna eklenir. '.
                'Sıralama için POST /api/settings/pipeline-stages/reorder ucunu kullanın.',
            'is_active.missing' => 'Yeni aşama daima aktif oluşturulur.',
        ];
    }
}
