<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Log Retention (gün)
    |--------------------------------------------------------------------------
    |
    | `logs:prune` komutunun --days ile ezilmediği sürece kullandığı varsayılan
    | saklama süreleri (ROADMAP R5). .env üzerinden ortam bazlı değiştirilebilir;
    | komut içinde hard-code edilmez.
    |
    */
    'log_retention' => [
        'page_visits' => (int) env('LOG_RETENTION_PAGE_VISITS_DAYS', 90),
        'sessions' => (int) env('LOG_RETENTION_SESSIONS_DAYS', 365),
        'activities' => (int) env('LOG_RETENTION_ACTIVITIES_DAYS', 365),
    ],

];
