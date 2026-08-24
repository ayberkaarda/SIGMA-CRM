<?php

namespace App\Http\Requests\Tickets;

use App\Services\Tickets\SlaService;
use App\Services\Tickets\TicketStatusMachine;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `GET /api/tickets` liste sözleşmesi — Faz 6/7 standart liste kuralları
 * (page/per_page/sort/q/filter). Yetkilendirme burada DEĞİL,
 * TicketController::index() içinde Policy ile yapılır.
 */
class IndexTicketRequest extends FormRequest
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
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'nullable', 'string', 'max:64'],
            'q' => ['sometimes', 'nullable', 'string', 'max:255'],
            'filter' => ['sometimes', 'array'],
            'filter.status' => ['sometimes', 'nullable', Rule::in(TicketStatusMachine::statuses())],
            'filter.priority' => ['sometimes', 'nullable', Rule::in(SlaService::PRIORITIES)],
            'filter.assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'filter.company_id' => ['sometimes', 'nullable', 'integer', 'exists:companies,id'],
            'filter.contact_id' => ['sometimes', 'nullable', 'integer', 'exists:contacts,id'],
            'filter.category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'filter.tag_id' => ['sometimes', 'nullable', 'integer', 'exists:tags,id'],
            // `boolean` kuralı "1"/"0"/"true"/"false"/1/0/true/false kabul
            // eder — query string'den her zaman string geldiği için bu şart.
            'filter.sla_breached' => ['sometimes', 'nullable', 'boolean'],
            'filter.from' => ['sometimes', 'nullable', 'date'],
            'filter.to' => ['sometimes', 'nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'per_page.max' => 'Sayfa başına kayıt sayısı en fazla :max olabilir.',
            'filter.status.in' => 'Seçilen durum filtresi geçerli değil.',
            'filter.priority.in' => 'Seçilen öncelik filtresi geçerli değil.',
            'filter.assigned_to.exists' => 'Seçilen atanan kişi filtresi geçerli değil.',
            'filter.company_id.exists' => 'Seçilen firma filtresi geçerli değil.',
            'filter.contact_id.exists' => 'Seçilen kişi filtresi geçerli değil.',
            'filter.tag_id.exists' => 'Seçilen etiket filtresi geçerli değil.',
            'filter.sla_breached.boolean' => 'SLA ihlali filtresi yalnızca 0 veya 1 olabilir.',
            'filter.from.date' => 'Başlangıç tarihi geçerli bir tarih olmalıdır.',
            'filter.to.date' => 'Bitiş tarihi geçerli bir tarih olmalıdır.',
        ];
    }

    /**
     * Repository/Service katmanının beklediği düz filtre dizisini üretir.
     *
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        $validated = $this->validated();
        $filter = $validated['filter'] ?? [];

        return [
            'q' => $validated['q'] ?? null,
            'status' => $filter['status'] ?? null,
            'priority' => $filter['priority'] ?? null,
            'assigned_to' => $filter['assigned_to'] ?? null,
            'company_id' => $filter['company_id'] ?? null,
            'contact_id' => $filter['contact_id'] ?? null,
            'category' => $filter['category'] ?? null,
            'tag_id' => $filter['tag_id'] ?? null,
            'sla_breached' => filter_var($filter['sla_breached'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'from' => $filter['from'] ?? null,
            'to' => $filter['to'] ?? null,
            'sort' => $validated['sort'] ?? null,
            'per_page' => $validated['per_page'] ?? 25,
        ];
    }
}
