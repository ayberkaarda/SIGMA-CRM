<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

/*
 * ROADMAP R5: page_visit_logs / session_logs / activity_log günlük olarak
 * budanır. 03:17 gibi düz olmayan bir dakika seçildi ki başka zamanlanmış
 * işlerle (genelde :00/:30'da kümelenir) aynı ana denk gelmesin.
 * --force: zamanlanmış çalışma non-interactive'dir, onay isteyemez.
 */
Schedule::command('logs:prune --force')->dailyAt('03:17');
