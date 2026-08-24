<?php

namespace App\Http\Requests\Tasks;

use App\Support\MorphTargets;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * `PATCH /api/tasks/{task}` — Yetkilendirme TaskController::update() içinde
 * Policy ile yapılır.
 *
 * `completed_at` buradan KESİNLİKLE değiştirilemez: `missing` kuralı bu
 * alan gövdede bulunursa (değeri ne olursa olsun) 422 üretir. Tamamlama
 * yalnızca `PATCH /api/tasks/{task}/complete` üzerinden yönetilir (bkz.
 * TaskService::complete()) — aksi halde `status`/`completed_at` çifti bu
 * uçtan tutarsız bir kombinasyona (ör. status='pending' ama completed_at
 * dolu) çekilebilirdi.
 */
class UpdateTaskRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'reminder_at' => ['sometimes', 'nullable', 'date', 'before_or_equal:due_at'],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'status' => ['sometimes', Rule::in(['pending', 'in_progress', 'completed', 'cancelled'])],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'taskable_type' => ['sometimes', 'nullable', 'string', Rule::in(array_keys(MorphTargets::TARGETS)), 'required_with:taskable_id'],
            'taskable_id' => ['sometimes', 'nullable', 'integer', 'required_with:taskable_type'],

            // Bu uçtan HİÇ gönderilemez (değeri boş/null olsa dahi).
            'completed_at' => ['missing'],
        ];
    }

    protected function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $type = $this->input('taskable_type');
            $id = $this->input('taskable_id');

            if ($type !== null && $id !== null && ! MorphTargets::exists($type, $id)) {
                $validator->errors()->add('taskable_id', 'Belirtilen hedef kayıt bulunamadı.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.max' => 'Başlık en fazla :max karakter olabilir.',
            'reminder_at.before_or_equal' => 'Hatırlatıcı, vade tarihinden sonra olamaz.',
            'priority.in' => 'Seçilen öncelik geçerli değil.',
            'status.in' => 'Seçilen durum geçerli değil.',
            'assigned_to.exists' => 'Seçilen atanan kişi geçerli değil.',
            'taskable_type.in' => 'Seçilen hedef türü geçerli değil.',
            'taskable_type.required_with' => 'Hedef türü ve hedef kimliği birlikte gönderilmelidir.',
            'taskable_id.required_with' => 'Hedef türü ve hedef kimliği birlikte gönderilmelidir.',
            'completed_at.missing' => 'Tamamlanma zamanı bu uçtan değiştirilemez. PATCH /api/tasks/{task}/complete ucunu kullanın.',
        ];
    }
}
