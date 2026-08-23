<?php

namespace App\Services\Auth;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * All authentication business logic lives here - controllers stay thin
 * (Controller -> Service -> Repository is the project-wide rule).
 */
class AuthService
{
    /**
     * Name of the named rate limiter registered in AppServiceProvider and
     * referenced by the `throttle:login` middleware on POST /api/login.
     */
    public const LIMITER_NAME = 'login';

    /**
     * Failed attempts tolerated inside one throttle window.
     */
    public const MAX_LOGIN_ATTEMPTS = 5;

    /**
     * Base lockout in minutes; doubles on every consecutive lockout.
     */
    public const BASE_LOCKOUT_MINUTES = 1;

    /**
     * Upper bound for the exponential backoff (minutes).
     */
    public const MAX_LOCKOUT_MINUTES = 60;

    /**
     * How long the escalation counter itself is remembered (minutes).
     * After a quiet period the offender starts from the base lockout again.
     */
    public const LOCKOUT_MEMORY_MINUTES = 180;

    /**
     * Throttle key for a login attempt.
     *
     * Deliberately combines the submitted e-mail AND the client IP:
     *  - IP only would let one bad actor behind a NAT / office gateway lock out
     *    every colleague sharing that address;
     *  - e-mail only would let a distributed attacker cheaply lock a known
     *    account out, and would be trivially resettable from any other IP.
     */
    public static function throttleKey(string $email, ?string $ip): string
    {
        return 'login:'.sha1(mb_strtolower(trim($email)).'|'.((string) $ip));
    }

    /**
     * The cache key the throttle middleware actually counts against.
     *
     * A named limiter does not store attempts under the raw `Limit::by()` key:
     * ThrottleRequests::handleRequestUsingNamedLimiter() rewrites it to
     * `md5($limiterName.$limit->key)`. Reading or clearing the counter from the
     * outside therefore has to go through the exact same derivation - using the
     * raw key would silently operate on a counter nobody ever writes to.
     *
     * (Key hashing is on by default; this application never calls
     * ThrottleRequests::shouldHashKeys(false).)
     */
    public static function limiterKey(string $throttleKey): string
    {
        return md5(static::LIMITER_NAME.$throttleKey);
    }

    /**
     * Cache key holding how many consecutive lockouts this identity produced.
     */
    public static function lockoutCounterKey(string $throttleKey): string
    {
        return $throttleKey.':lockouts';
    }

    /**
     * Current window length in minutes for the given throttle key.
     *
     * 1st window 1 min, then 2, 4, 8, 16, 32, capped at 60.
     */
    public static function lockoutMinutes(string $throttleKey): int
    {
        $lockouts = (int) Cache::get(static::lockoutCounterKey($throttleKey), 0);

        $minutes = static::BASE_LOCKOUT_MINUTES * (2 ** min($lockouts, 16));

        return (int) min($minutes, static::MAX_LOCKOUT_MINUTES);
    }

    /**
     * Authenticate the request and return the signed-in user.
     *
     * @throws ValidationException invalid credentials (422)
     * @throws HttpResponseException deactivated account (403)
     */
    public function login(LoginRequest $request): User
    {
        $credentials = $request->credentials();
        $throttleKey = static::throttleKey($credentials['email'], $request->ip());

        $guard = Auth::guard('web');

        // validate() checks the credentials WITHOUT establishing a session, so a
        // deactivated account is never signed in - not even for a single request.
        if (! $guard->validate($credentials)) {
            $this->registerFailedAttempt($throttleKey, $credentials['email'], $request);

            throw ValidationException::withMessages([
                // Never reveal whether the e-mail exists: an unknown account and
                // a wrong password produce the exact same message and status,
                // which is what blocks user enumeration.
                'email' => 'E-posta veya şifre hatalı.',
            ]);
        }

        /** @var User $user */
        $user = $guard->getLastAttempted();

        if (! $user->is_active) {
            $this->logAuthFailure('deactivated_account', $credentials['email'], $request);

            throw new HttpResponseException(static::deactivatedResponse());
        }

        $guard->login($user, $request->remember());

        // Session fixation protection: the session id the visitor arrived with
        // must never survive the privilege change. MANDATORY.
        $request->session()->regenerate();

        $this->clearThrottle($throttleKey);

        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        return $user->refresh()->load('roles');
    }

    /**
     * Terminate the current session completely.
     */
    public function logout(Request $request): void
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }

    /**
     * Closed-loop password reset.
     *
     * Users cannot reset their own password - an administrator does it through
     * POST /api/users/{user}/reset-password. We only record the request and
     * always answer 202, whether or not the address exists, so the endpoint
     * cannot be used to enumerate accounts.
     *
     * NOTE: no table is created here on purpose. The persistent administrator
     * approval queue is Phase 10 work; until then the application log is the
     * record of record.
     */
    public function recordPasswordResetRequest(string $email, Request $request): void
    {
        Log::info('Şifre sıfırlama talebi alındı.', [
            'email' => $email,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'requested_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Replace the user's password and clear the forced-change flag.
     *
     * The order below is binding (docs/AUTH-FLOWS.md §3.2).
     *
     * $user MUST be the instance the guard hydrated for this request
     * ($request->user()). Sanctum's AuthenticateSession middleware re-stores
     * `password_hash_web` from the guard's user in its after-response phase; if
     * we mutated a different instance the session would be stamped with the
     * OLD hash and the very session that just changed the password would be
     * logged out on its next request.
     */
    public function changePassword(User $user, string $password, Request $request): User
    {
        $wasForced = (bool) $user->must_change_password;

        // Plain text in - the model cast ('password' => 'hashed') hashes it.
        $user->password = $password;
        $user->must_change_password = false;

        // Rotate on EVERY password change: a "remember me" cookie minted while
        // the temporary password was valid must not survive on any device.
        $user->setRememberToken(Str::random(60));

        $user->save();

        // A password change is a privilege boundary - same rule as login.
        $request->session()->regenerate();

        // NOTE: the user's OTHER sessions need no code here. Sanctum's
        // AuthenticateSession (config/sanctum.php -> middleware.authenticate_session)
        // compares the session's `password_hash_web` against the current hash on
        // every stateful request and throws 401 on a mismatch, so they drop on
        // their next request. Redis sessions are not indexed by user id, so this
        // lazy model is the deliberate design (see App\Events\UserDeactivated).
        Log::info('Şifre değiştirildi.', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
            'was_forced' => $wasForced,
        ]);

        return $user->refresh()->load('roles');
    }

    /**
     * The single canonical 403 payload for an unchanged temporary password.
     * Used by the EnsurePasswordIsChanged middleware.
     *
     * 403 and not 401/404/422: the caller IS authenticated, the resource does
     * exist and the request is well formed - access is conditionally refused.
     * Same shape as USER_DEACTIVATED: 403 plus a distinguishing `code`.
     */
    public static function passwordChangeRequiredResponse(): JsonResponse
    {
        return response()->json([
            'errors' => [
                'message' => 'Devam etmeden önce geçici şifrenizi değiştirmeniz gerekiyor.',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
            ],
        ], 403);
    }

    /**
     * The single canonical 403 payload for a deactivated account.
     * Used by the login flow and by the EnsureUserIsActive middleware.
     */
    public static function deactivatedResponse(): JsonResponse
    {
        return response()->json([
            'errors' => [
                'message' => 'Hesabınız devre dışı bırakılmış. Lütfen sistem yöneticisi ile iletişime geçin.',
                'code' => 'USER_DEACTIVATED',
            ],
        ], 403);
    }

    /**
     * Record a failed attempt and escalate the lockout window when the
     * allowance for the current window has just been exhausted.
     *
     * The throttle:login middleware already performed the hit() for this
     * request, so attempts() is authoritative at this point.
     */
    protected function registerFailedAttempt(string $throttleKey, string $email, Request $request): void
    {
        $this->logAuthFailure('invalid_credentials', $email, $request);

        if (RateLimiter::attempts(static::limiterKey($throttleKey)) < static::MAX_LOGIN_ATTEMPTS) {
            return;
        }

        $counterKey = static::lockoutCounterKey($throttleKey);
        $lockouts = (int) Cache::get($counterKey, 0) + 1;

        Cache::put($counterKey, $lockouts, now()->addMinutes(static::LOCKOUT_MEMORY_MINUTES));

        Log::warning('Giriş kilitlendi, artan bekleme uygulanıyor.', [
            'email' => $email,
            'ip' => $request->ip(),
            'consecutive_lockouts' => $lockouts,
            'next_window_minutes' => static::lockoutMinutes($throttleKey),
        ]);
    }

    /**
     * Drop both the attempt counter and the escalation counter.
     */
    protected function clearThrottle(string $throttleKey): void
    {
        RateLimiter::clear(static::limiterKey($throttleKey));
        Cache::forget(static::lockoutCounterKey($throttleKey));
    }

    /**
     * Failed sign-in attempts are logged for now.
     *
     * NOTE: the durable session_logs table (a queryable audit trail surfaced in
     * the UI) is Phase 5 work; the application log is sufficient at this stage.
     */
    protected function logAuthFailure(string $reason, string $email, Request $request): void
    {
        Log::warning('Başarısız giriş denemesi.', [
            'reason' => $reason,
            'email' => $email,
            'ip' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'attempted_at' => now()->toIso8601String(),
        ]);
    }
}
