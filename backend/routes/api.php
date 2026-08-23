<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoleController;
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
    });
});
