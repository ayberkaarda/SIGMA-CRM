<?php

namespace App\Exports;

use App\Repositories\LogRepository;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Spatie\Activitylog\Models\Activity as ActivityLog;

/**
 * `GET /api/logs/export?type=activities&format=xlsx`.
 *
 * `subject_type` daima kısa ad olarak yazılır (LogRepository::SUBJECT_TYPE_MAP) —
 * ham sınıf adı dışa aktarma dosyasına da sızdırılmaz.
 *
 * @implements FromQuery<ActivityLog>
 */
class ActivityLogsExport implements FromQuery, WithChunkReading, WithHeadings, WithMapping
{
    /**
     * @param  Builder<ActivityLog>  $query  Filtrelenmiş, sıralanmış (LogQueryService::export) sorgu.
     */
    public function __construct(protected Builder $query) {}

    public function query(): Builder
    {
        return $this->query;
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'id', 'log_name', 'event', 'description',
            'subject_type', 'subject_id', 'causer_id', 'causer_name', 'created_at',
        ];
    }

    /**
     * @return array<int, mixed>
     */
    public function map($row): array
    {
        /** @var ActivityLog $row */
        return [
            $row->id,
            $row->log_name,
            $row->event,
            $row->description,
            LogRepository::shortNameForSubjectType($row->subject_type) ?? $row->subject_type,
            $row->subject_id,
            $row->causer_id,
            $row->causer?->name,
            $row->created_at?->toIso8601String(),
        ];
    }

    public function chunkSize(): int
    {
        return 500;
    }
}
