<?php

namespace App\Providers;

use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerSuperAdminGate();
        $this->registerLoginRateLimiter();
    }

    /**
     * The `Super Admin` role holds ZERO permission rows on purpose - its
     * authority comes from here, so a newly added permission is granted to it
     * automatically without a migration or a re-seed.
     */
    protected function registerSuperAdminGate(): void
    {
        Gate::before(function ($user, string $ability) {
            // MUST return null (not false) for everyone else. Returning false
            // here would short-circuit Gate and deny EVERY ability for EVERY
            // non-super-admin, bypassing all policies and permission checks.
            return $user->hasRole(UserResource::SUPER_ADMIN_ROLE) ? true : null;
        });
    }

    /**
     * Named limiter used by `throttle:login` on POST /api/login.
     *
     * 5 attempts per window, and the window itself grows exponentially on
     * consecutive lockouts (1 -> 2 -> 4 -> 8 ... capped at 60 minutes), so a
     * brute-force run gets progressively more expensive while an honest user
     * who mistyped their password twice is barely inconvenienced.
     *
     * The key mixes e-mail and IP - see AuthService::throttleKey() for why
     * neither one alone is acceptable.
     */
    protected function registerLoginRateLimiter(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $key = AuthService::throttleKey(
                (string) $request->input('email'),
                $request->ip()
            );

            return Limit::perMinutes(
                AuthService::lockoutMinutes($key),
                AuthService::MAX_LOGIN_ATTEMPTS
            )
                ->by($key)
                ->response(function (Request $request, array $headers) {
                    // $headers already carries Retry-After + X-RateLimit-*.
                    return response()->json([
                        'errors' => [
                            'message' => 'Çok fazla başarısız giriş denemesi. Lütfen bir süre sonra tekrar deneyin.',
                            'code' => 'TOO_MANY_ATTEMPTS',
                        ],
                    ], 429, $headers);
                });
        });
    }
}
