<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\CustomFieldController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\DealMoveController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LeadImportController;
use App\Http\Controllers\Api\LogController;
use App\Http\Controllers\Api\PageVisitController;
use App\Http\Controllers\Api\PipelineStageController;
use App\Http\Controllers\Api\PresenceController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Sanctum SPA (cookie session) mode. The `api` middleware group already
| carries EnsureFrontendRequestsAreStateful (bootstrap/app.php ->
| withMiddleware -> statefulApi), which turns requests coming from a stateful
| domain into ordinary session requests - cookies, CSRF and all.
|
| GET /sanctum/csrf-cookie is registered by Sanctum's own service provider and
| must NOT be redeclared here.
|
*/

/*
 * Public endpoints. These never reach `active` or `password.changed`.
 */
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('login');

Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:6,1')
    ->name('password.forgot');

/*
 * Authenticated endpoints.
 *
 * `active` (App\Http\Middleware\EnsureUserIsActive) runs after auth so a user
 * deactivated mid-session is rejected on their very next request - and before
 * `password.changed`, so a deactivated account gets USER_DEACTIVATED rather
 * than being told to change a password it can no longer use.
 */
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    /*
     * WHITELIST: the only endpoints exempt from `must_change_password`.
     *
     *   logout          - the single legitimate escape hatch
     *   me              - the SPA reads identity and the flag from here
     *   password/change - the flow itself
     *
     * Nothing else belongs here. `users.*` and `roles.*` are NOT exempt; the
     * change-password screen needs none of them.
     */
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AuthController::class, 'me'])->name('me');

    // throttle:6,1 is mandatory: `current_password` is an in-session password
    // oracle and must not be left open to unlimited guessing.
    Route::post('/password/change', [AuthController::class, 'changePassword'])
        ->middleware('throttle:6,1')
        ->name('password.change');

    /*
     * Everything below is subject to the forced password change.
     *
     * This is a WHITELIST by route structure, not a path-string blacklist
     * inside the middleware: a blacklist is fail-open, so every endpoint added
     * in a later phase would silently become a bypass if someone forgot to
     * list it. Here, new modules are protected by default - they simply get
     * declared inside this group.
     */
    Route::middleware('password.changed')->group(function () {
        /*
         * Users + roles - controllers are owned by the parallel lane (C);
         * the route contract is fixed here.
         */
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::patch('/users/{user}/active', [UserController::class, 'toggleActive'])->name('users.active');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');

        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');

        /*
         * Presence — the polled/first-paint view of `presence-online`.
         *
         * Inside the `password.changed` group like every other data endpoint.
         * Note the deliberate asymmetry with /broadcasting/auth, which is NOT
         * behind that gate (see bootstrap/app.php): opening a socket during a
         * forced password change is allowed, reading the roster of colleagues
         * is not. The socket is a delivery channel for the user's own
         * security events; this is other people's data.
         */
        Route::get('/presence/online', [PresenceController::class, 'online'])
            ->name('presence.online');

        /*
         * Log listeleme + dışa aktarma (Faz 5 / D).
         *
         * `logs.view` her üç listeleme ucunu, `logs.export` dışa aktarmayı
         * korur — kontrol LogController içinde Gate::allows() ile yapılır
         * (model policy yok, izin adı doğrudan kullanılır).
         */
        Route::get('/logs/sessions', [LogController::class, 'sessions'])->name('logs.sessions');
        Route::get('/logs/page-visits', [LogController::class, 'pageVisits'])->name('logs.page-visits');
        Route::get('/logs/activities', [LogController::class, 'activities'])->name('logs.activities');
        Route::get('/logs/export', [LogController::class, 'export'])->name('logs.export');

        /*
         * Sayfa ziyaret takibi (Faz 5 / C) — her kimliği doğrulanmış kullanıcı
         * yalnızca kendi ziyaretini kaydeder/günceller. Controller C
         * tarafından yazılıyor; route sözleşmesi burada sabitlenir.
         */
        Route::post('/page-visits', [PageVisitController::class, 'store'])->name('page-visits.store');
        Route::patch('/page-visits/{pageVisit}/heartbeat', [PageVisitController::class, 'heartbeat'])->name('page-visits.heartbeat');

        /*
         * Leads (Faz 6 / B) — route sırası KASITLIDIR: sabit segmentli
         * uçlar (`check-duplicates`, `import`, `import/template`) parametreli
         * `{lead}` rotasından ÖNCE tanımlanmalı, yoksa Laravel bu segmentleri
         * `{lead}` route-model-binding parametresi sanıp 404 üretir.
         *
         * `import/{batch}` da `import/template`'ten SONRA gelmeli — aksi
         * halde `template` kelimesi `{batch}` parametresi sanılır.
         */
        Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
        Route::post('/leads', [LeadController::class, 'store'])->name('leads.store');
        Route::post('/leads/check-duplicates', [LeadController::class, 'checkDuplicates'])->name('leads.check-duplicates');
        Route::post('/leads/import', [LeadImportController::class, 'store'])->name('leads.import.store');
        Route::get('/leads/import/template', [LeadImportController::class, 'template'])->name('leads.import.template');
        Route::get('/leads/import/{batch}', [LeadImportController::class, 'status'])->name('leads.import.status');
        Route::get('/leads/{lead}', [LeadController::class, 'show'])->name('leads.show');
        Route::patch('/leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
        Route::delete('/leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');
        Route::post('/leads/{lead}/convert', [LeadController::class, 'convert'])->name('leads.convert');
        Route::patch('/leads/{lead}/assign', [LeadController::class, 'assign'])->name('leads.assign');

        /*
         * Contacts (Faz 6 / C) — controller C şeridinin; route sözleşmesi
         * burada sabitlenir. `timeline` sabit segmenti `{contact}`'tan
         * ÖNCE gelmez çünkü kendisi zaten `{contact}`'a bağlı bir alt-yol.
         */
        Route::get('/contacts', [ContactController::class, 'index'])->name('contacts.index');
        Route::post('/contacts', [ContactController::class, 'store'])->name('contacts.store');
        Route::get('/contacts/{contact}', [ContactController::class, 'show'])->name('contacts.show');
        Route::patch('/contacts/{contact}', [ContactController::class, 'update'])->name('contacts.update');
        Route::delete('/contacts/{contact}', [ContactController::class, 'destroy'])->name('contacts.destroy');
        Route::get('/contacts/{contact}/timeline', [ContactController::class, 'timeline'])->name('contacts.timeline');

        /*
         * Companies (Faz 6 / C) — controller C şeridinin; route sözleşmesi
         * burada sabitlenir.
         */
        Route::get('/companies', [CompanyController::class, 'index'])->name('companies.index');
        Route::post('/companies', [CompanyController::class, 'store'])->name('companies.store');
        Route::get('/companies/{company}', [CompanyController::class, 'show'])->name('companies.show');
        Route::patch('/companies/{company}', [CompanyController::class, 'update'])->name('companies.update');
        Route::delete('/companies/{company}', [CompanyController::class, 'destroy'])->name('companies.destroy');
        Route::get('/companies/{company}/timeline', [CompanyController::class, 'timeline'])->name('companies.timeline');

        /*
         * Ortak (Faz 6 / B) — etiketler ve özel alan tanımları.
         */
        Route::get('/tags', [TagController::class, 'index'])->name('tags.index');
        Route::post('/tags', [TagController::class, 'store'])->name('tags.store');
        Route::get('/custom-fields', [CustomFieldController::class, 'index'])->name('custom-fields.index');

        /*
         * Fırsatlar / Deals (Faz 7 / B) — Kanban pano ucu + CRUD + pipeline
         * aşamaları. Controller'ları B şeridinin; `/move` ise A şeridinin
         * DealMoveController'ına bağlıdır (route sözleşmesi burada
         * sabitlenir, controller/service/request A'nın dosyaları).
         *
         * Route sırası KASITLIDIR: `/deals/board` sabit segmenti
         * `/deals/{deal}` route-model-binding parametresinden ÖNCE
         * tanımlanmalı, yoksa Laravel `board`'u bir deal id sanıp 404
         * üretir — Faz 6'da aynı tuzak `leads/check-duplicates` için
         * yaşandı (bkz. yukarı). `/deals/{deal}/move` ve `/deals/{deal}/assign`
         * ise zaten `{deal}`'e bağlı alt-yollar oldukları için bu sıra
         * sorununu YAŞAMAZ.
         */
        Route::get('/deals', [DealController::class, 'index'])->name('deals.index');
        Route::get('/deals/board', [DealController::class, 'board'])->name('deals.board');
        Route::post('/deals', [DealController::class, 'store'])->name('deals.store');
        Route::get('/deals/{deal}', [DealController::class, 'show'])->name('deals.show');
        Route::patch('/deals/{deal}', [DealController::class, 'update'])->name('deals.update');
        Route::delete('/deals/{deal}', [DealController::class, 'destroy'])->name('deals.destroy');
        Route::patch('/deals/{deal}/move', [DealMoveController::class, 'update'])->name('deals.move');
        Route::patch('/deals/{deal}/assign', [DealController::class, 'assign'])->name('deals.assign');

        Route::get('/pipeline-stages', [PipelineStageController::class, 'index'])->name('pipeline-stages.index');
    });
});
